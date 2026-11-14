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
  - `/videos/update`: 新着動画の追加専用（約5分毎）。既存動画は更新しない（更新は `/videos/check`）
    - デフォルト / `?provider=youtube`: 各チャンネルの最新アップロードのうち未保存のものを追加
    - `?provider=twitch`: アーカイブ（VOD）とアップロード動画のうち未保存のものを追加
      - アーカイブは `stream_id` で配信中の行と突合し、同じレコードに紐づける
      - Twitch は配信開始と同時にアーカイブを作るため、配信中のアーカイブは `LIVE` のまま扱う
    - サムネイルは追加時に取得する
    - 1リクエストでは単一プロバイダのみ処理（タイムアウト回避）
  - `/videos/check`: 既存動画の情報更新と削除判定
    - デフォルト（`provider=youtube`、パラメータなし）: UPCOMING/LIVE の動画を更新（1分毎）
    - `?provider=twitch`: 配信の LIVE 状態を同期（1分毎）
      - 配信が始まったら `status: LIVE`、合成 id `live:{stream_id}` の行を追加（Twitch には配信予定の事前登録がないため、ここで検出する）
      - 配信中はタイトル変更に追従する
      - 配信が終わったら `ENDED` にし、アーカイブが見つかればその情報（VOD id・長さ・タイトル）に差し替える
      - アーカイブが残らない配信（VOD 無効など）は合成 id のまま `ENDED` で残る
    - `?mode=recent` / `?provider=twitch&mode=recent`: 最新100件（ENDED/PUBLISHED）のメタデータ更新と削除判定
      - Twitch は配信直後だとサムネイルが未生成のため、サムネイルがない動画はここで補完する
    - `?mode=all` / `?provider=twitch&mode=all`: 全動画の削除判定のみ（週2回）
  - `/videos/cascade-from-talents`: タレント削除／復活に伴う動画の連鎖処理（5分毎）
    - 削除済みタレントに紐づく未削除動画をソフトデリート（`deleted_reason = talent_deleted`）
    - 復活済みタレントに紐づく `talent_deleted` のみ復旧（`unavailable` / `withdrawn` は対象外）
    - 1実行あたり最大100件
  - `/videos/backfill`: 管理画面から依頼された過去動画の取り込み（1分毎）
    - 依頼は Redis のキュー（`@shinju-date/video-backfill`）に 1 アカウント 1 ジョブで積まれる
    - 1 回の実行では約 50 秒の間、ジョブを順番に 1 ページずつ読み、未保存の動画だけを `/videos/update` と同じ経路で保存する
    - 時間内に読み終わらなかったジョブはカーソルを保存してキューの末尾に戻し、次の実行で続きから読む
    - 失敗したジョブは次の実行で再試行し、3 回続けて失敗するか、アカウントが見つからなければ失敗として終える
    - キューが空のときは何もしない。レート制限は `/videos/update` と別なので、新着の取得を妨げない
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
  - パラメータなし: UPCOMING/LIVE動画の情報更新（Twitch は配信の LIVE 状態の同期）
  - `mode=recent`: 最新100件の動画の情報更新と削除判定
  - `mode=all`: 全動画の削除判定（情報更新なし）
- `POST /videos/cascade-from-talents` - タレント削除／復活に伴う動画の連鎖ソフトデリート／復旧
- `POST /videos/backfill` - 過去動画の取り込みキューの処理

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

## クローラーの構成

YouTube / Twitch のクローラー（`/videos/update`・`/videos/check`・`/videos/backfill`・`/talents/update`）の本体は `@shinju-date/scraper` にあります。取得・差分判定・データベースへの書き込み・サムネイル保存はすべてそちらの担当で、仕様もそちらの README にあります。

このアプリが受け持つのは次の 3 つです。

1. クエリを検証し、cron 共通の実行基盤（認証・レート制限・Sentry チェックイン・エラー処理）に載せる
2. プロバイダーに対応するスクレイパーを作り、ルートに応じた操作を呼ぶ
3. 変更があれば公開サイトのキャッシュを再検証し、最終同期時刻を記録する

| ルート                      | 呼び出す操作              |
| --------------------------- | ------------------------- |
| `/videos/update`            | `addNewVideos`            |
| `/videos/check`             | `refreshLiveVideos`       |
| `/videos/check?mode=recent` | `refreshRecentVideos`     |
| `/videos/check?mode=all`    | `removeUnavailableVideos` |
| `/talents/update`           | `syncAccounts`            |
| `/videos/backfill`          | `addPastVideos`           |

スクレイパーは 1 アカウント・1 動画単位の失敗では止まらず、その失敗を Sentry に報告して続行します。実行全体が失敗した場合だけ例外になり、実行基盤が 500 と Sentry チェックインの `error` にします。

### スケジュールの定義

Sentry Cron Monitoring に渡すスケジュールは、`vercel.json` の `crons` とは別にコード側のジョブ定義にも書いてあります。スケジュールを変えるときは両方を更新してください（ずれているとテストが落ちます）。

## ディレクトリ構成ルール

このアプリケーションでは、共通ロジックとルート固有ロジックを明確に分離するため、以下のディレクトリ構成ルールを定めます：

### `lib/` - 共通ライブラリ

複数のルートやバッチ処理で共有される汎用的な機能を配置します。

**配置基準:**

- 複数のルート間で再利用されるロジック
- アプリケーション全体で共通の設定やクライアント（Supabase、Redis など）
- データベース操作の基本関数（汎用的なCRUD操作）
- 汎用的なユーティリティ

### `app/*/\_lib/` - ルート固有ライブラリ

特定のルートハンドラでのみ使用されるロジックを配置します。

**配置基準:**

- 特定のエンドポイント専用の処理ロジック
- そのルートでのみ意味を持つ型定義
- クエリパラメータのスキーマ定義
- ルート固有のヘルパー関数

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
