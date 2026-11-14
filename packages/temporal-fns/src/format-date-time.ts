import parseISO8601 from './parse-iso8601.js'

// These helpers build strings with `padStart` instead of `toLocaleString`
// because the output of `hour: '2-digit'` differs between Temporal
// implementations (the native one returns `1:22`, while temporal-polyfill
// returns `01:22`). The server uses the native implementation and some
// browsers use the polyfill, so relying on `toLocaleString` causes hydration
// errors.

function padNumber(value: number): string {
  return value.toString(10).padStart(2, '0')
}

interface FormatDateOptions {
  includeYear?: boolean
}

/**
 * Formats the date part of a timestamp as `YYYY/MM/DD` (or `MM/DD`).
 *
 * The output does not depend on the Temporal implementation, so it can be
 * used safely in components rendered on both the server and the client.
 */
export function formatDate(
  timestamp: Temporal.ZonedDateTime | Temporal.PlainDate,
  options: FormatDateOptions = {},
): string {
  const { includeYear = true } = options
  const monthAndDay = `${padNumber(timestamp.month)}/${padNumber(timestamp.day)}`

  return includeYear
    ? `${timestamp.year.toString(10)}/${monthAndDay}`
    : monthAndDay
}

interface FormatTimeOptions {
  includeSeconds?: boolean
}

/**
 * Formats the time part of a timestamp as `HH:mm` (or `HH:mm:ss`).
 *
 * The output does not depend on the Temporal implementation, so it can be
 * used safely in components rendered on both the server and the client.
 */
export function formatTime(
  timestamp: Temporal.ZonedDateTime | Temporal.PlainTime,
  options: FormatTimeOptions = {},
): string {
  const { includeSeconds = false } = options
  const hourAndMinute = `${padNumber(timestamp.hour)}:${padNumber(timestamp.minute)}`

  return includeSeconds
    ? `${hourAndMinute}:${padNumber(timestamp.second)}`
    : hourAndMinute
}

interface FormatDateTimeOptions {
  includeSeconds?: boolean
}

/**
 * Formats a timestamp as `YYYY/MM/DD HH:mm` (or `YYYY/MM/DD HH:mm:ss`).
 */
export default function formatDateTime(
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

export function formatDateTimeFromISO(isoString: string): string {
  const instant = parseISO8601(isoString)
  // Use JST timezone
  const zonedDateTime = instant.toZonedDateTimeISO('Asia/Tokyo')
  return formatDateTimeWithSeconds(zonedDateTime)
}
