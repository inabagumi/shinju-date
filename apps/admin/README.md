# Admin App

コンテンツ管理用の管理画面。

## 構成

- **Next.js (App Router)**: React ベースのフルスタックフレームワーク
- **TypeScript**: 型安全な JavaScript
- **Tailwind CSS**: ユーティリティファーストの CSS フレームワーク

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

## 環境変数

`.env.local.sample` を `.env.local` にコピーして、必要な環境変数を設定してください。

```bash
cp .env.local.sample .env.local
```

### 必要な環境変数

- `NEXT_PUBLIC_BASE_URL`: アプリケーションのベースURL（例: `http://localhost:4000` または本番環境のURL）
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase プロジェクトのURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase の匿名キー
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis のRESTトークン
- `UPSTASH_REDIS_REST_URL`: Upstash Redis のREST URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase のサービスロールキー（RLS を迂回する処理で使う）

任意の環境変数:

- `GOOGLE_API_KEY`: YouTube Data API のキー（YouTube のチャンネルの同期）
- `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`: Twitch のユーザーの登録と同期
- `REVALIDATE_URL` / `REVALIDATE_SECRET_TOKEN`: 公開サイトのキャッシュの再検証

## MSW（Mock Service Worker）

開発環境でAPIモックを使用する場合：

```bash
# MSWを有効にして開発
ENABLE_MSW=true pnpm run dev
```

MSWはサーバー側（`instrumentation.ts`）でだけ起動します。詳細は [MSWガイド](../../docs/msw-guide.md) を参照してください。
