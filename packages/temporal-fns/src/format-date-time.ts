import type { Temporal } from 'temporal-polyfill'
import parseISO8601 from './parse-iso8601.js'

interface FormatDateTimeOptions {
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

export function formatDateTimeWithSeconds(
  timestamp: Temporal.ZonedDateTime,
): string {
  return formatDateTime(timestamp, { includeSeconds: true })
}

export function formatDateTimeFromISO(isoString: string): string {
  const instant = parseISO8601(isoString)
  // Use JST timezone
  const zonedDateTime = instant.toZonedDateTimeISO('Asia/Tokyo')
  return formatDateTimeWithSeconds(zonedDateTime)
}
