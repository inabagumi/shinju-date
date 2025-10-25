# @shinju-date/logger

共有ログ機能を提供するパッケージ。

## 構成

- **Sentry**: エラートラッキングとロギング
- **TypeScript**: 型安全なロガー実装

## 使用方法

```typescript
import { logger } from '@shinju-date/logger'

// ログ出力の例
logger.info('Information message')
logger.error('Error message', error)
logger.warn('Warning message')
```

## テスト

```bash
pnpm run test
```

## 開発

```bash
# ビルド
pnpm run build

# 開発モード（ウォッチ）
pnpm run dev
```