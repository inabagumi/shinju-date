# @shinju-date/temporal-fns

Temporal API を使用した日時操作ユーティリティを提供するパッケージ。

## 構成

- **Temporal**: グローバルの Temporal API（サーバーは Node.js のネイティブ実装、Webブラウザは各アプリの `instrumentation-client.ts` で読み込む `temporal-polyfill`）
- **TypeScript**: 型安全な日時操作

## 使用方法

すべての関数を、パッケージの入口（`@shinju-date/temporal-fns`）から名前付きで import します。

```typescript
import { TIME_ZONE } from "@shinju-date/constants";
import {
  formatDateKey,
  formatDateTimeFromISO,
  getMondayOfWeek,
  max,
  min,
  startOfHour,
} from "@shinju-date/temporal-fns";

// 日付をキー用フォーマット（YYYYMMDD形式）
const dateKey = formatDateKey(zonedDateTime); // "20251111"

// 週の月曜日を取得
const monday = getMondayOfWeek(zonedDateTime);

// 時間の開始点を取得
const hourStart = startOfHour(zonedDateTime);

// 最大・最小値の取得
const maxDate = max(zonedDateTime1, zonedDateTime2);
const minDate = min(zonedDateTime1, zonedDateTime2);

// ISO 8601 の文字列を、指定したタイムゾーンの日時にフォーマット
const dateTime = formatDateTimeFromISO("2026-03-25T16:22:03Z", {
  timeZone: TIME_ZONE,
}); // "2026/03/26 01:22:03"
```

日の始まりは、`Temporal.ZonedDateTime` の `startOfDay()` を使います。

## 提供機能

- **formatDate**: 日付のフォーマット（`YYYY/MM/DD`）
- **formatDateKey**: Redisキーなどに使用する日付フォーマット（YYYYMMDD形式）
- **formatDateTime** / **formatDateTimeWithSeconds**: 日時のフォーマット
- **formatDateTimeFromISO**: ISO 8601 の文字列を、指定したタイムゾーンの日時にフォーマット
- **formatDuration**: 期間のフォーマット
- **formatRelativeTime**: 相対時刻のフォーマット
- **formatTime**: 時刻のフォーマット（`HH:mm`）
- **getMondayOfWeek**: 週の月曜日を取得
- **startOfHour**: 時間の開始点を取得
- **max/min**: 日時の最大・最小値を取得
- **toDBString**: データベース保存用の文字列変換

## 開発

```bash
# ビルド
pnpm run build
```
