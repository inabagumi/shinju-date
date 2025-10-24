# Web App

公開ウェブサイト (`https://shinju.date`) のフロントエンド。

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

## MSW（Mock Service Worker）

開発環境でAPIモックを使用する場合：

```bash
# サービスワーカーファイルの生成
pnpm run msw:init

# MSWを有効にして開発
ENABLE_MSW=true pnpm run dev
```