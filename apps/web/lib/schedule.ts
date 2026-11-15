import { WEEKDAYS } from './date-heading'

/** The path of the schedule of the week that includes today */
export const SCHEDULE_PATH = '/schedule'

/** `YYYY-MM-DD`, the only form `/schedule/[date]` accepts */
const SCHEDULE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Parse the date of `/schedule/[date]`. Returns `null` for values that are not
 * `YYYY-MM-DD` or are not a real date (such as `2026-02-30`).
 */
export function parseScheduleDate(value: string): Temporal.PlainDate | null {
  if (!SCHEDULE_DATE_PATTERN.test(value)) {
    return null
  }

  try {
    return Temporal.PlainDate.from(value, { overflow: 'reject' })
  } catch {
    return null
  }
}

/**
 * The Monday of the week that includes the date. Weeks start on Monday, as the
 * timeline of the home page does.
 */
export function getWeekStart(date: Temporal.PlainDate): Temporal.PlainDate {
  return date.subtract({ days: date.dayOfWeek - 1 })
}

/** The 7 days of the week that starts on `weekStart`, from Monday to Sunday */
export function getWeekDays(
  weekStart: Temporal.PlainDate,
): Temporal.PlainDate[] {
  return Array.from({ length: 7 }, (_, index) => weekStart.add({ days: index }))
}

/**
 * The path of the schedule of the week that includes the date. It always
 * points to the Monday, so each week has a single URL.
 */
export function getSchedulePath(date: Temporal.PlainDate): string {
  return `${SCHEDULE_PATH}/${getWeekStart(date).toString()}`
}

/**
 * The range of the week that starts on `weekStart`, such as
 * `2026年11月9日〜15日`. The month and the year of Sunday are written only when
 * they differ from those of Monday.
 */
export function formatWeekRange(weekStart: Temporal.PlainDate): string {
  const weekEnd = weekStart.add({ days: 6 })
  const start = `${weekStart.year}年${weekStart.month}月${weekStart.day}日`

  if (weekEnd.year !== weekStart.year) {
    return `${start}〜${weekEnd.year}年${weekEnd.month}月${weekEnd.day}日`
  }

  if (weekEnd.month !== weekStart.month) {
    return `${start}〜${weekEnd.month}月${weekEnd.day}日`
  }

  return `${start}〜${weekEnd.day}日`
}

/**
 * The heading of a day on the schedule, such as `11/9（月）`. It is short
 * enough for a column of the 7 days on a wide screen.
 *
 * `toLocaleString` is not used, as its output differs between the native
 * Temporal and temporal-polyfill and causes hydration errors.
 */
export function formatScheduleDay(date: Temporal.PlainDate): string {
  return `${date.month}/${date.day}（${WEEKDAYS[date.dayOfWeek - 1]}）`
}
