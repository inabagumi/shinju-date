# @shinju-date/helpers

汎用的なユーティリティ関数を提供するパッケージ。

## 構成

- **TypeScript**: 型安全なユーティリティ関数
- **Web 標準 API**: `Request` / `Response` を使うヘルパー（Next.js には依存しない）

## 使用方法

```typescript
import { formatNumber, isNonNullable, range } from '@shinju-date/helpers'

formatNumber(12345) // '12,345'
range(3) // [0, 1, 2]
values.filter(isNonNullable) // null と undefined を除く
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
