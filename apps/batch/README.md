# Batch App

定期実行されるバッチ処理。

## 構成

- **Next.js (Route Handlers)**: API Routes を使用したバッチ処理
- **TypeScript**: 型安全な JavaScript

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

- **データ同期処理** (`/videos/update`, `/videos/check`, `/talents/update`)
  - YouTubeからの動画とチャンネル情報の同期
- **統計情報の更新** (`/stats/snapshot`)
  - ダッシュボード統計のスナップショット保存（日次比較用）
- **推薦クエリの更新** (`/recommendation/queries/update`)
  - 推薦システムのクエリ更新

各バッチ処理は API Routes として実装され、Vercel Cron から定期的に呼び出されます。

### 統計スナップショット (`/stats/snapshot`)

管理画面ダッシュボードの統計比較機能をサポートするため、毎日 0:05 AM UTC（日本時間 9:05 AM）に**前日分（0:00～23:59）**のデータをRedisに保存します：

- **サマリー統計**: 動画数、タレント数、用語数など
  - 前日中に存在していた動画・タレントを集計（`created_at < 翌日0:00` かつ `deleted_at IS NULL OR deleted_at >= 翌日0:00`）
- **アナリティクス統計**: 検索数、クリック数、人気キーワード数など
  - 前日のRedisキーから取得

これにより、ダッシュボードへのアクセスがない日でも、前日比較・週間比較が正確に表示されます。

**重要**: バッチ処理は前日分のデータを集計するため、実行タイミングが重要です。0:05 AM UTC に実行することで、前日の23:59:59までのデータを正確に集計できます。

スナップショットは Redis に 30 日間保存されます（TTL: 30日）。