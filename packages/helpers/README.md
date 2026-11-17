# @shinju-date/helpers

2つ以上のアプリやパッケージが使う、小さな関数を置くパッケージ。

1つのアプリだけが使う関数は、ここではなく、そのアプリの `lib/` に置きます（[共有パッケージに置くもの](../../docs/coding-guidelines.md#共有パッケージに置くもの)）。

## 構成

- **TypeScript**: 型安全なユーティリティ関数
- **Web 標準 API**: `Request` / `Response` を使うヘルパー（Next.js には依存しない）

## 提供機能

- **createErrorResponse**: エラーのメッセージを `{ error }` の JSON で返す `Response` を作る（`Cache-Control: no-store` を付ける）
- **formatNumber**: 数値をカンマ区切りの文字列にする（`ja-JP`）
- **getVideoExternalUrl**: 動画を YouTube や Twitch で開く URL を作る
- **isMaintenanceMode**: メンテナンスモードが有効かを Redis から読む（Redis を読めないときは `false`）
- **range**: 数値の配列を作る（Python の `range()` と同じ）

## 使用方法

```typescript
import {
  createErrorResponse,
  formatNumber,
  getVideoExternalUrl,
  isMaintenanceMode,
  range,
} from '@shinju-date/helpers'

createErrorResponse('Not Found', { status: 404 }) // { "error": "Not Found" } を返す Response

formatNumber(12345) // '12,345'

getVideoExternalUrl({ platform: 'youtube', youtubeVideoId: 'abc' }) // 'https://www.youtube.com/watch?v=abc'

await isMaintenanceMode(redisClient) // true または false

range(3) // [0, 1, 2]
range(2, 5) // [2, 3, 4]
```

公開している関数と型は [`src/index.ts`](src/index.ts) を見てください。

## テスト

```bash
pnpm run test
```

## 開発

```bash
# ビルド
pnpm run build
```
