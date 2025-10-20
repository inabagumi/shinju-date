import type { Temporal } from 'temporal-polyfill'

export default function formatDateTime(
  timestamp: Temporal.ZonedDateTime,
): string {
  return timestamp.toLocaleString('ja-JP', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
