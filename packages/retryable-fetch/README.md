# @shinju-date/retryable-fetch

リトライ機能付きの fetch ユーティリティを提供するパッケージ。

## 構成

- **p-retry**: リトライロジック
- **TypeScript**: 型安全な fetch 実装

## 使用方法

```typescript
import { retryableFetch } from '@shinju-date/retryable-fetch'

// リトライ機能付きfetchの使用例
const response = await retryableFetch('https://api.example.com/data', {
  method: 'GET',
  retries: 3,
  retryDelay: 1000
})
```

## 機能

- 自動リトライ機能
- カスタマイズ可能なリトライ設定
- エラーハンドリング

## 開発

```bash
# ビルド
pnpm run build

# 開発モード（ウォッチ）
pnpm run dev
```