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

管理画面ダッシュボードの統計比較機能をサポートするため、毎日 1:00 AM UTC に以下のデータをRedisに保存します：

- **サマリー統計**: 動画数、タレント数、用語数など
- **アナリティクス統計**: 検索数、クリック数、人気キーワード数など

これにより、ダッシュボードへのアクセスがない日でも、前日比較・週間比較が正確に表示されます。

スナップショットは Redis に 30 日間保存されます（TTL: 30日）。