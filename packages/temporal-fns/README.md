# @shinju-date/temporal-fns

Temporal API を使用した日時操作ユーティリティを提供するパッケージ。

## 構成

- **temporal-polyfill**: Temporal API ポリフィル
- **TypeScript**: 型安全な日時操作

## 使用方法

```typescript
import { formatDate } from '@shinju-date/temporal-fns/format-date'
import { getMondayOfWeek } from '@shinju-date/temporal-fns/get-monday-of-week'
import { startOfHour } from '@shinju-date/temporal-fns/start-of-hour'
import { max, min } from '@shinju-date/temporal-fns'

// 日付フォーマット
const formatted = formatDate(new Date())

// 週の月曜日を取得
const monday = getMondayOfWeek(new Date())

// 時間の開始点を取得
const hourStart = startOfHour(new Date())

// 最大・最小値の取得
const maxDate = max(date1, date2)
const minDate = min(date1, date2)
```

## 提供機能

- **format-date**: 日付のフォーマット
- **get-monday-of-week**: 週の月曜日を取得
- **start-of-hour**: 時間の開始点を取得
- **max/min**: 日時の最大・最小値を取得

## 開発

```bash
# ビルド
pnpm run build

# 開発モード（ウォッチ）
pnpm run dev
```