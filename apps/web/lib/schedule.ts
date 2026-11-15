import { TIME_ZONE } from '@shinju-date/constants'
import { formatDate } from '@shinju-date/temporal-fns'
import { WEEKDAYS } from './date-heading'

/** The path of the schedule of the week that includes today */
export const SCHEDULE_PATH = '/schedule'

/** How many weeks after the current week the schedule can show */
export const SCHEDULE_WEEKS_AHEAD = 4

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
 * The path of the schedule. Without a date, it is the week that includes
 * today (`/schedule`). With one, it always points to the Monday of the week,
 * so each week has a single URL.
 */
export function getSchedulePath(weekStart?: Temporal.PlainDate): string {
  if (!weekStart) {
    return SCHEDULE_PATH
  }

  return `${SCHEDULE_PATH}/${getWeekStart(weekStart).toString()}`
}

export interface ScheduleWeekRange {
  /** The Monday of the first week that can be shown */
  first: Temporal.PlainDate
  /** The Monday of the last week that can be shown */
  last: Temporal.PlainDate
}

interface GetScheduleWeekRangeOptions {
  /** The date the oldest video starts on, or `null` when there is no video */
  oldestDate: Temporal.PlainDate | null
  today: Temporal.PlainDate
}

/**
 * The weeks the schedule can show: from the week of the oldest video to
 * `SCHEDULE_WEEKS_AHEAD` weeks after the current week. Without any video, the
 * first week is the current week.
 */
export function getScheduleWeekRange({
  oldestDate,
  today,
}: GetScheduleWeekRangeOptions): ScheduleWeekRange {
  const currentWeekStart = getWeekStart(today)
  const first = oldestDate ? getWeekStart(oldestDate) : currentWeekStart

  return {
    first:
      Temporal.PlainDate.compare(first, currentWeekStart) > 0
        ? currentWeekStart
        : first,
    last: currentWeekStart.add({ weeks: SCHEDULE_WEEKS_AHEAD }),
  }
}

/** Whether the week that starts on `weekStart` is in the range */
export function isWeekInRange(
  weekStart: Temporal.PlainDate,
  { first, last }: ScheduleWeekRange,
): boolean {
  return (
    Temporal.PlainDate.compare(weekStart, first) >= 0 &&
    Temporal.PlainDate.compare(weekStart, last) <= 0
  )
}

function formatMonthDay(date: Temporal.PlainDate, withWeekday: boolean) {
  const monthDay = `${date.month}月${date.day}日`

  return withWeekday
    ? `${monthDay}（${WEEKDAYS[date.dayOfWeek - 1]}）`
    : monthDay
}

interface FormatWeekRangeOptions {
  /** Add the weekdays, as in `2026年11月9日（月）〜11月15日（日）` */
  withWeekdays?: boolean
}

/**
 * The range of the week that starts on `weekStart`, such as
 * `2026年11月9日〜11月15日`. The year of Sunday is written only when it differs
 * from that of Monday.
 */
export function formatWeekRange(
  weekStart: Temporal.PlainDate,
  { withWeekdays = false }: FormatWeekRangeOptions = {},
): string {
  const weekEnd = weekStart.add({ days: 6 })
  const start = `${weekStart.year}年${formatMonthDay(weekStart, withWeekdays)}`
  const end =
    weekEnd.year === weekStart.year
      ? formatMonthDay(weekEnd, withWeekdays)
      : `${weekEnd.year}年${formatMonthDay(weekEnd, withWeekdays)}`

  return `${start}〜${end}`
}

/**
 * The heading of a day on the schedule, such as `11/09（月）`, in the same form
 * as the timeline of the home page.
 *
 * `toLocaleString` is not used, as its output differs between the native
 * Temporal and temporal-polyfill and causes hydration errors.
 */
export function formatScheduleDay(date: Temporal.PlainDate): string {
  return `${formatDate(date, { includeYear: false })}（${WEEKDAYS[date.dayOfWeek - 1]}）`
}

/** The hour (0 to 23 in `TIME_ZONE`) a video starts in */
export function getStartHour(publishedAt: string): number {
  return Temporal.Instant.from(publishedAt).toZonedDateTimeISO(TIME_ZONE).hour
}

/**
 * The hours some of the videos start in, in ascending order. The schedule has
 * a row for each of them only, as the streams gather in the evening and most
 * of the 24 hours would be empty.
 */
export function getStartHours(
  videos: readonly { published_at: string }[],
): number[] {
  return [
    ...new Set(videos.map((video) => getStartHour(video.published_at))),
  ].sort((a, b) => a - b)
}
