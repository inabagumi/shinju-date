# Batch App

定期実行されるバッチ処理。

## 構成

- **Next.js**: React ベースのフルスタックフレームワーク（Route Handlers使用）
- **TypeScript**: 型安全な JavaScript
- **Sentry**: エラートラッキングと監視

## 開発

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm run dev

# ビルド
pnpm run build

# 本番環境での起動
pnpm run start

# E2Eテストの実行
pnpm exec playwright test
```

## E2Eテスト

PlaywrightによるE2Eテストが実装されています。詳細は[E2E Testing Guide](../../docs/e2e-testing.md)を参照してください。

```bash
# E2Eテストの実行
pnpm exec playwright test

# UIモードでの実行（デバッグに便利）
pnpm exec playwright test --ui
```

## バッチ処理

このアプリケーションは、以下のような定期処理を実行します：

- **データ同期処理**（`provider` でプラットフォームを分離。省略時は `youtube`）
  - `/videos/update`: 新着動画の追加専用
    - デフォルト / `?provider=youtube`: YouTube新着（約5分毎）
    - `?provider=twitch`: Twitchアーカイブ（VOD）新着（約5分毎、YouTubeとオフセット）
    - **既存動画は一切更新しない** - すべての更新は`/videos/check`が担当
    - サムネイル処理も新規動画のみ対象
    - 1リクエストでは単一プロバイダのみ処理（タイムアウト回避）
  - `/videos/check`: 既存動画の情報更新と削除判定
    - デフォルト（`provider=youtube`、パラメータなし）: UPCOMING/LIVE（1分毎）
    - `?mode=recent` / `?provider=twitch&mode=recent`: 最新100件のメタデータ更新
    - `?mode=all` / `?provider=twitch&mode=all`: 削除判定のみ（週2回）
    - Twitch は `mode=recent|all` 必須（default モードは 400）
  - `/videos/cascade-from-talents`: タレント削除／復活に伴う動画の連鎖処理（5分毎）
    - 削除済みタレントに紐づく未削除動画をソフトデリート（`deleted_reason = talent_deleted`）
    - 復活済みタレントに紐づく `talent_deleted` のみ復旧（`unavailable` / `withdrawn` は対象外）
    - 1実行あたり最大100件
  - `/talents/update`: タレント／チャンネル情報の更新
    - デフォルト / `?provider=youtube`: YouTubeチャンネル同期（3時間毎）
    - `?provider=twitch`: Twitchユーザー（display_name / login）同期
- **統計情報の更新** (`/stats/snapshot`)
  - ダッシュボード統計のスナップショット保存（日次比較用）
- **推薦クエリの更新** (`/recommendation/queries/update`)
  - 推薦システムのクエリ更新
- **用語の人気度更新** (`/terms/popularity/update`)
  - 検索ログから用語の人気度を集計・更新（日次）

各バッチ処理は Next.js の Route Handlers として実装され、Vercel Cron から定期的に呼び出されます。

### API エンドポイント

- `GET /api/healthz` - ヘルスチェック（常に正常応答）
- `GET /api/readyz` - 準備状態チェック（Supabase/Redis接続確認）
- `POST /stats/snapshot` - 統計スナップショット作成
- `POST /recommendation/queries/update` - 推薦クエリ更新
- `POST /talents/update` - タレント情報更新
  - `provider=youtube`（デフォルト）/ `provider=twitch`
- `POST /terms/popularity/update` - 用語の人気度更新
- `POST /videos/update` - 新着動画の追加
  - `provider=youtube`（デフォルト）/ `provider=twitch`
- `POST /videos/check` - 既存動画の情報更新と削除判定
  - `provider=youtube`（デフォルト）/ `provider=twitch`
  - パラメータなし: UPCOMING/LIVE動画の情報更新（YouTubeのみ）
  - `mode=recent`: 最新100件の動画の情報更新
  - `mode=all`: 全動画の削除判定（情報更新なし）
- `POST /videos/cascade-from-talents` - タレント削除／復活に伴う動画の連鎖ソフトデリート／復旧

### 統計スナップショット (`/stats/snapshot`)

管理画面ダッシュボードの統計比較機能をサポートするため、毎日 0:05 AM UTC（日本時間 9:05 AM）に**前日分（0:00～23:59）**のデータをRedisに保存します：

- **サマリー統計**: 動画数、タレント数、用語数など
  - 前日中に存在していた動画・タレントを集計（`created_at < 翌日0:00` かつ `deleted_at IS NULL OR deleted_at >= 翌日0:00`）
- **アナリティクス統計**: 検索数、クリック数、人気キーワード数など
  - 前日のRedisキーから取得

これにより、ダッシュボードへのアクセスがない日でも、前日比較・週間比較が正確に表示されます。

**重要**: バッチ処理は前日分のデータを集計するため、実行タイミングが重要です。0:05 AM UTC に実行することで、前日の23:59:59までのデータを正確に集計できます。

スナップショットは Redis に 30 日間保存されます（TTL: 30日）。

### 用語の人気度更新 (`/terms/popularity/update`)

検索サジェスト機能の精度向上のため、毎日 0:00 AM UTC（日本時間 9:00 AM）に用語の人気度を更新します：

- **データソース**: Upstash Redis の `SEARCH_POPULAR_ALL_TIME` ソートセット
  - ユーザーの検索クエリが累積的にカウントされている
  - 全期間での検索回数を集計
- **更新処理**:
  - Redis から検索回数データを取得
  - `terms` テーブルの各用語の `popularity` カラムを更新
  - データベースに存在しない検索用語は無視（新規用語の自動追加は行わない）
- **影響範囲**:
  - `suggestions_v2` RPC関数が人気度を考慮してサジェストを返すようになる
  - 検索回数の多い用語が優先的に表示される

**注意**: 人気度の更新は、既存の `terms` テーブルに登録されている用語のみが対象です。新しい用語の追加は別途手動または専用のバッチ処理で行う必要があります。

## ディレクトリ構成ルール

このアプリケーションでは、共通ロジックとルート固有ロジックを明確に分離するため、以下のディレクトリ構成ルールを定めます：

### `lib/` - 共通ライブラリ

複数のルートやバッチ処理で共有される汎用的な機能を配置します。

**配置基準:**
- 複数のルート間で再利用されるロジック
- アプリケーション全体で共通の設定やクライアント（Supabase、Redis、YouTubeなど）
- データベース操作の基本関数（汎用的なCRUD操作）
- サムネイル処理など、汎用的なユーティリティ

**例:**
- `lib/supabase.ts` - Supabaseクライアントの初期化
- `lib/redis.ts` - Redisクライアントの初期化
- `lib/youtube.ts` - YouTube APIクライアントの初期化
- `lib/provider.ts` - バッチ `provider` クエリ（youtube / twitch）のパース
- `lib/database/operations.ts` - 汎用的なデータベース操作（`getSavedVideos`, `getSavedTwitchVideos`, `upsertVideos`, `processTwitchUsers`など）
- `lib/database/video-updates.ts` - 動画更新処理（複数ルートで使用）
- `lib/thumbnails/` - サムネイル処理ロジック（YouTube / Twitch URL両対応）

プラットフォーム固有の取得オーケストレーションは workspace パッケージ:

- `@shinju-date/youtube-scraper` - YouTube 用 Scraper
- `@shinju-date/twitch-scraper` - Twitch 用 Scraper（Helix コールバック API）

### `app/*/\_lib/` - ルート固有ライブラリ

特定のルートハンドラでのみ使用されるロジックを配置します。

**配置基準:**
- 特定のエンドポイント専用の処理ロジック
- そのルートでのみ意味を持つ型定義
- クエリパラメータのスキーマ定義
- ルート固有のヘルパー関数

**例:**
- `app/videos/check/_lib/get-saved-videos.ts` - `/videos/check`専用の動画取得ロジック
- `app/videos/check/_lib/types.ts` - `/videos/check`で使用する型定義
- `app/videos/check/_lib/query-schema.ts` - クエリパラメータのバリデーションスキーマ
- `app/videos/check/_lib/get-monitor-slug.ts` - Sentryモニタースラッグ生成
- `app/videos/update/_lib/constants.ts` - `/videos/update`専用の定数定義
- `app/videos/update/_lib/save-videos.ts` - `/videos/update`専用のYouTube動画保存処理
- `app/videos/update/_lib/save-twitch-videos.ts` - `/videos/update`専用のTwitch動画保存処理
- `app/videos/check/_lib/get-saved-twitch-videos.ts` - Twitch動画の取得
- `app/videos/check/_lib/process-twitch-videos-for-check.ts` - Twitch動画の更新・削除

### 判断基準

新しい関数やモジュールを追加する際は、以下のフローチャートに従って配置先を決定してください：

1. **複数のルートで使用される可能性があるか？**
   - Yes → `lib/`に配置
   - No → 2へ

2. **特定のルート固有のロジックか？**
   - Yes → `app/*/_lib/`に配置
   - No → `lib/`に配置（将来の再利用性を考慮）

### 重要な原則

- **単一責任の原則**: 各関数は1つの明確な責任を持つ
- **再利用性の考慮**: 将来的に複数のルートで使用される可能性がある場合は`lib/`に配置
- **依存関係の方向**: `app/*/`は`lib/`に依存できるが、`lib/`は`app/*/`に依存してはいけない
- **テストの配置**: テストファイルは対応するモジュールと同じディレクトリに`__tests__/`または`.test.ts`として配置