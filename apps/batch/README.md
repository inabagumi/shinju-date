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
```

## バッチ処理

このアプリケーションは、以下のような定期処理を実行します：

- **データ同期処理**
  - `/videos/update`: 新着動画の追加専用（10分毎）
    - YouTubeから新しい動画のみを取得し、データベースに追加
    - 既に存在する動画は更新せず、`/videos/check`に委譲
  - `/videos/check`: 既存動画の情報更新と削除判定
    - デフォルト（パラメータなし）: UPCOMING/LIVE動画の情報更新（1分毎）
      - `videos.status`が`UPCOMING`または`LIVE`の動画が対象
      - ステータス、タイトル、サムネイル、配信時刻などを最新化
    - `mode=recent`: 最新100件の動画情報を更新（30分毎）
      - ステータス、タイトル、サムネイル、配信時刻などを最新化
    - `mode=all`: 全動画の削除判定のみ実行（週1回、火曜日）
      - YouTube上で存在しなくなった動画をデータベースから削除
      - 情報更新は行わない
  - `/talents/update`: タレント情報の更新（3時間毎）
    - チャンネル情報の同期
- **統計情報の更新** (`/stats/snapshot`)
  - ダッシュボード統計のスナップショット保存（日次比較用）
- **推薦クエリの更新** (`/recommendation/queries/update`)
  - 推薦システムのクエリ更新

各バッチ処理は Next.js の Route Handlers として実装され、Vercel Cron から定期的に呼び出されます。

### API エンドポイント

- `GET /api/healthz` - ヘルスチェック（常に正常応答）
- `GET /api/readyz` - 準備状態チェック（Supabase/Redis接続確認）
- `POST /stats/snapshot` - 統計スナップショット作成
- `POST /recommendation/queries/update` - 推薦クエリ更新
- `POST /talents/update` - タレント情報更新
- `POST /videos/update` - 新着動画の追加
- `POST /videos/check` - 既存動画の情報更新と削除判定
  - パラメータなし: UPCOMING/LIVE動画の情報更新
  - `mode=recent`: 最新100件の動画の情報更新
  - `mode=all`: 全動画の削除判定（情報更新なし）

### 統計スナップショット (`/stats/snapshot`)

管理画面ダッシュボードの統計比較機能をサポートするため、毎日 0:05 AM UTC（日本時間 9:05 AM）に**前日分（0:00～23:59）**のデータをRedisに保存します：

- **サマリー統計**: 動画数、タレント数、用語数など
  - 前日中に存在していた動画・タレントを集計（`created_at < 翌日0:00` かつ `deleted_at IS NULL OR deleted_at >= 翌日0:00`）
- **アナリティクス統計**: 検索数、クリック数、人気キーワード数など
  - 前日のRedisキーから取得

これにより、ダッシュボードへのアクセスがない日でも、前日比較・週間比較が正確に表示されます。

**重要**: バッチ処理は前日分のデータを集計するため、実行タイミングが重要です。0:05 AM UTC に実行することで、前日の23:59:59までのデータを正確に集計できます。

スナップショットは Redis に 30 日間保存されます（TTL: 30日）。