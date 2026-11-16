# @shinju-date/logger

共有ログ機能を提供するパッケージ。

## 構成

- **Sentry**: エラートラッキングとロギング
- **TypeScript**: 型安全なロガー実装

## 使用方法

```typescript
import { logger } from '@shinju-date/logger'

// ログ出力の例
logger.info('動画を同期しました', { count: 10 })
logger.error('動画の同期に失敗しました', { error })
logger.warn('レスポンスが空でした')
```

メッセージは日本語で書き、第2引数の属性のキーと値は英単語か数値にします。

## テスト

```bash
pnpm run test
```

## 開発

```bash
# ビルド
pnpm run build
```
