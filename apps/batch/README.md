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

- データ同期処理
- 統計情報の更新
- クリーンアップ処理

各バッチ処理は API Routes として実装され、外部スケジューラーから呼び出されます。