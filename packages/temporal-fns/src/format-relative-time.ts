import { Temporal } from 'temporal-polyfill'

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

  // Calculate the difference in nanoseconds and convert to seconds
  const diffNanoseconds = nowInstant.since(instant).total('seconds')

  // Handle future dates (date is after now)
  if (diffNanoseconds < 0) {
    const absDiff = Math.abs(diffNanoseconds)
    if (absDiff < 60) {
      return formatter.format(Math.ceil(absDiff), 'seconds')
    }
    if (absDiff < 3600) {
      return formatter.format(Math.ceil(absDiff / 60), 'minutes')
    }
    if (absDiff < 86400) {
      return formatter.format(Math.ceil(absDiff / 3600), 'hours')
    }
    if (absDiff < 604800) {
      return formatter.format(Math.ceil(absDiff / 86400), 'days')
    }
    if (absDiff < 2592000) {
      return formatter.format(Math.ceil(absDiff / 604800), 'weeks')
    }
    if (absDiff < 31536000) {
      return formatter.format(Math.ceil(absDiff / 2592000), 'months')
    }
    return formatter.format(Math.ceil(absDiff / 31536000), 'years')
  }

  // Handle past dates
  if (diffNanoseconds < 60) {
    return formatter.format(-Math.floor(diffNanoseconds), 'seconds')
  }

  const diffMinutes = diffNanoseconds / 60
  if (diffMinutes < 60) {
    return formatter.format(-Math.floor(diffMinutes), 'minutes')
  }

  const diffHours = diffMinutes / 60
  if (diffHours < 24) {
    return formatter.format(-Math.floor(diffHours), 'hours')
  }

  const diffDays = diffHours / 24
  if (diffDays < 7) {
    return formatter.format(-Math.floor(diffDays), 'days')
  }

  const diffWeeks = diffDays / 7
  if (diffWeeks < 4) {
    return formatter.format(-Math.floor(diffWeeks), 'weeks')
  }

  const diffMonths = diffDays / 30
  if (diffMonths < 12) {
    return formatter.format(-Math.floor(diffMonths), 'months')
  }

  const diffYears = diffDays / 365
  return formatter.format(-Math.floor(diffYears), 'years')
}
