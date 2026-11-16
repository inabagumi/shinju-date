const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const YEAR = 365 * DAY
const MONTH = YEAR / 12

/**
 * Each entry is `[upper bound in seconds (exclusive), divisor in seconds, unit]`.
 * The lower bound of each unit equals its divisor, so the value never falls
 * below 1 for units larger than seconds.
 */
const UNITS: readonly (readonly [
  number,
  number,
  Intl.RelativeTimeFormatUnit,
])[] = [
  [MINUTE, 1, 'seconds'],
  [HOUR, MINUTE, 'minutes'],
  [DAY, HOUR, 'hours'],
  [WEEK, DAY, 'days'],
  [MONTH, WEEK, 'weeks'],
  [YEAR, MONTH, 'months'],
  [Number.POSITIVE_INFINITY, YEAR, 'years'],
]

/**
 * Format a date as a relative time string using Intl.RelativeTimeFormat
 * @param date - The date to format (as Temporal.Instant or Temporal.ZonedDateTime)
 * @param locale - The locale to use (defaults to 'ja')
 * @param now - Optional reference time (defaults to current time)
 * @returns A relative time string (e.g., "5分前", "2時間前")
 */
export function formatRelativeTime(
  date: Temporal.Instant | Temporal.ZonedDateTime,
  locale = 'ja',
  now?: Temporal.Instant,
): string {
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  // Convert inputs to Instant for comparison
  const instant = date instanceof Temporal.Instant ? date : date.toInstant()
  const nowInstant = now ?? Temporal.Now.instant()

  // Positive when the date is in the future, negative when it is in the past
  const diffSeconds = instant.since(nowInstant).total('seconds')
  const absSeconds = Math.abs(diffSeconds)
  const sign = diffSeconds < 0 ? -1 : 1

  for (const [upperBound, divisor, unit] of UNITS) {
    if (absSeconds < upperBound) {
      const floored = Math.floor(absSeconds / divisor)
      // Avoid "this month" / "this year" from `numeric: 'auto'` for units
      // larger than seconds. Only seconds may be 0 (formatted as "now").
      const value = unit === 'seconds' ? floored : Math.max(1, floored)

      // Use `+ 0` to turn `-0` into `0` so that 0 seconds is always "now"
      return formatter.format(sign * value + 0, unit)
    }
  }

  // Unreachable: the last entry has an infinite upper bound
  throw new RangeError(`Invalid time difference: ${diffSeconds}`)
}
