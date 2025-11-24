import { Temporal } from 'temporal-polyfill'

/**
 * Returns the start of the day (00:00:00.000000000) for the given date.
 *
 * @param date - A Temporal.ZonedDateTime or Temporal.PlainDate object
 * @returns A new Temporal.ZonedDateTime or Temporal.PlainDate set to the start of the day
 *
 * @example
 * ```typescript
 * import { startOfDay } from '@shinju-date/temporal-fns'
 * import { Temporal } from 'temporal-polyfill'
 *
 * const now = Temporal.Now.zonedDateTimeISO('Asia/Tokyo')
 * const dayStart = startOfDay(now)
 * // Returns: 2025-11-14T00:00:00+09:00[Asia/Tokyo]
 * ```
 */
export default function startOfDay<T extends Temporal.ZonedDateTime>(date: T): T
export default function startOfDay(date: Temporal.PlainDate): Temporal.PlainDate
export default function startOfDay(
  date: Temporal.ZonedDateTime | Temporal.PlainDate,
): Temporal.ZonedDateTime | Temporal.PlainDate {
  // PlainDate doesn't have time fields, so return it as-is
  if (date instanceof Temporal.PlainDate) {
    return date
  }

  // This is a ZonedDateTime
  return date.with({
    hour: 0,
    microsecond: 0,
    millisecond: 0,
    minute: 0,
    nanosecond: 0,
    second: 0,
  })
}
