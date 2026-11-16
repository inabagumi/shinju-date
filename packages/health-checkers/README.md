# @shinju-date/health-checkers

ウェブサービスのヘルスチェック機能を提供するパッケージ。

## 構成

- **Supabase**: データベースヘルスチェック
- **Upstash Redis**: Redis ヘルスチェック
- **TypeScript**: 型安全なヘルスチェック実装

## 使用方法

```typescript
import {
  checkRedisHealth,
  checkSupabaseHealth,
} from '@shinju-date/health-checkers'

// データベースヘルスチェック
const dbHealth = await checkSupabaseHealth(supabaseClient)

// Redis ヘルスチェック
const redisHealth = await checkRedisHealth(redisClient)
```

複数のチェックをまとめて実行する `runHealthChecks` と、チェックの結果から readiness のレスポンス（失敗したときは 503）を作る `createReadinessResponse` もあります。

## テスト

```bash
pnpm run test
```

## 開発

```bash
# ビルド
pnpm run build
```
