# @shinju-date/constants

共通定数を提供するパッケージ。

## 構成

- **TypeScript**: 型安全な定数定義
- **tsdown**: 高速ビルドツール

## 使用方法

```typescript
import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDateKey } from '@shinju-date/temporal-fns'

// タイムゾーンは直接書かず、TIME_ZONE を使う
const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)

// Redis のキーは REDIS_KEYS から参照する
const key = `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${formatDateKey(now)}`
```

公開している定数と関数は [`src/index.ts`](src/index.ts) を見てください。

## 開発

```bash
# ビルド
pnpm run build
```
