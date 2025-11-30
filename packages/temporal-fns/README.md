# @shinju-date/temporal-fns

Temporal API を使用した日時操作ユーティリティを提供するパッケージ。

## 構成

- **temporal-polyfill**: Temporal API ポリフィル
- **TypeScript**: 型安全な日時操作

## 使用方法

```typescript
import { formatDateKey } from '@shinju-date/temporal-fns'
import { getMondayOfWeek } from '@shinju-date/temporal-fns/get-monday-of-week'
import { startOfHour } from '@shinju-date/temporal-fns/start-of-hour'
import { max, min } from '@shinju-date/temporal-fns'

// 日付をキー用フォーマット（YYYYMMDD形式）
const dateKey = formatDateKey(zonedDateTime) // "20251111"

// 週の月曜日を取得
const monday = getMondayOfWeek(zonedDateTime)

// 時間の開始点を取得
const hourStart = startOfHour(instant)

// 最大・最小値の取得
const maxDate = max(instant1, instant2)
const minDate = min(instant1, instant2)
```

## 提供機能

- **formatDateKey**: Redisキーなどに使用する日付フォーマット（YYYYMMDD形式）
- **formatDateTime**: 日時のフォーマット
- **formatDuration**: 期間のフォーマット
- **formatRelativeTime**: 相対時刻のフォーマット
- **getMondayOfWeek**: 週の月曜日を取得
- **startOfHour**: 時間の開始点を取得
- **max/min**: 日時の最大・最小値を取得
- **toDBString**: データベース保存用の文字列変換

## 開発

```bash
# ビルド
pnpm run build

# 開発モード（ウォッチ）
pnpm run dev
```