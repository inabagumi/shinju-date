import type { Temporal } from 'temporal-polyfill'

type FormatDateTimeOptions = {
  includeSeconds?: boolean
}

export default function formatDateTime(
  timestamp: Temporal.ZonedDateTime,
  options: FormatDateTimeOptions = {},
): string {
  const { includeSeconds = false } = options

  return timestamp.toLocaleString('ja-JP', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    year: 'numeric',
  })
}
