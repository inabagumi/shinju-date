import { formatDate } from './format-date.js'
import { formatTime } from './format-time.js'

interface FormatDateTimeOptions {
  includeSeconds?: boolean
}

/**
 * Formats a timestamp as `YYYY/MM/DD HH:mm` (or `YYYY/MM/DD HH:mm:ss`).
 */
export function formatDateTime(
  timestamp: Temporal.ZonedDateTime,
  options: FormatDateTimeOptions = {},
): string {
  const { includeSeconds = false } = options

  return `${formatDate(timestamp)} ${formatTime(timestamp, { includeSeconds })}`
}

export function formatDateTimeWithSeconds(
  timestamp: Temporal.ZonedDateTime,
): string {
  return formatDateTime(timestamp, { includeSeconds: true })
}

interface FormatDateTimeFromISOOptions extends FormatDateTimeOptions {
  timeZone: string
}

/**
 * Formats an ISO 8601 string in the given time zone as `YYYY/MM/DD HH:mm:ss`
 * (or `YYYY/MM/DD HH:mm` with `includeSeconds: false`).
 *
 * @example
 * ```typescript
 * import { TIME_ZONE } from '@shinju-date/constants'
 * import { formatDateTimeFromISO } from '@shinju-date/temporal-fns'
 *
 * formatDateTimeFromISO('2026-03-25T16:22:03Z', { timeZone: TIME_ZONE })
 * // "2026/03/26 01:22:03"
 * ```
 */
export function formatDateTimeFromISO(
  isoString: string,
  options: FormatDateTimeFromISOOptions,
): string {
  const { includeSeconds = true, timeZone } = options
  const zonedDateTime =
    Temporal.Instant.from(isoString).toZonedDateTimeISO(timeZone)

  return formatDateTime(zonedDateTime, { includeSeconds })
}
