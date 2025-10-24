# @shinju-date/health-checkers

ウェブサービスのヘルスチェック機能を提供するパッケージ。

## 構成

- **Supabase**: データベースヘルスチェック
- **Upstash Redis**: Redis ヘルスチェック
- **TypeScript**: 型安全なヘルスチェック実装

## 使用方法

```typescript
import { checkDatabaseHealth, checkRedisHealth } from '@shinju-date/health-checkers'

// データベースヘルスチェック
const dbHealth = await checkDatabaseHealth(supabaseClient)

// Redis ヘルスチェック
const redisHealth = await checkRedisHealth(redisClient)
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