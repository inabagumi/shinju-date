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
 * The Sunday of the week that includes the date. Weeks start on Sunday, as
 * most calendars in Japan do.
 */
export function getWeekStart(date: Temporal.PlainDate): Temporal.PlainDate {
  // `dayOfWeek` is 1 for Monday and 7 for Sunday
  return date.subtract({ days: date.dayOfWeek % 7 })
}

/** The 7 days of the week that starts on `weekStart`, from Sunday to Saturday */
export function getWeekDays(
  weekStart: Temporal.PlainDate,
): Temporal.PlainDate[] {
  return Array.from({ length: 7 }, (_, index) => weekStart.add({ days: index }))
}

/**
 * The path of the schedule. Without a date, it is the week that includes
 * today (`/schedule`). With one, it always points to the Sunday of the week,
 * so each week has a single URL.
 */
export function getSchedulePath(weekStart?: Temporal.PlainDate): string {
  if (!weekStart) {
    return SCHEDULE_PATH
  }

  return `${SCHEDULE_PATH}/${getWeekStart(weekStart).toString()}`
}

export interface ScheduleWeekRange {
  /** The Sunday of the first week that can be shown */
  first: Temporal.PlainDate
  /** The Sunday of the last week that can be shown */
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
  /** Add the weekdays, as in `2026年11月8日（日）〜11月14日（土）` */
  withWeekdays?: boolean
}

/**
 * The range of the week that starts on `weekStart`, such as
 * `2026年11月8日〜11月14日`. The year of the last day is written only when it
 * differs from that of the first day.
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

/** Minutes in a day, the height of the column of a day */
export const MINUTES_IN_DAY = 24 * 60

/** How long an upcoming or live stream is shown, as its end is not known */
export const DEFAULT_LENGTH_MINUTES = 60

/**
 * The shortest an item is drawn, so that a short video still has room for the
 * start time and the icon
 */
export const MIN_LENGTH_MINUTES = 30

interface PlacedVideo {
  duration: string | null
  published_at: string
  status: string
}

/**
 * How long the video takes on the schedule, in minutes: its duration for an
 * ended stream or a published video, and `DEFAULT_LENGTH_MINUTES` for an
 * upcoming or live one or one without a duration.
 */
export function getLengthMinutes(video: PlacedVideo): number {
  if (video.status === 'ENDED' || video.status === 'PUBLISHED') {
    const minutes = Temporal.Duration.from(video.duration ?? 'PT0S').total({
      unit: 'minute',
    })

    if (minutes > 0) {
      return minutes
    }
  }

  return DEFAULT_LENGTH_MINUTES
}

export interface ScheduleLayout<T> {
  /** The column of the item among the overlapping items, from 0 */
  column: number
  /** How many columns the overlapping items share */
  columns: number
  item: T
  /** How long the item is drawn, in minutes (cut at the end of the day) */
  length: number
  /** When the item starts, in minutes from 00:00 in `TIME_ZONE` */
  start: number
}

/**
 * Place the videos of a day on the time axis, as a calendar does: each starts
 * at its start time and is as long as `getLengthMinutes` (at least
 * `MIN_LENGTH_MINUTES`, and cut at the end of the day). The videos that
 * overlap share the width of the day side by side.
 */
export function layoutDay<T extends PlacedVideo>(
  videos: readonly T[],
): ScheduleLayout<T>[] {
  const placed = videos
    .map((item) => {
      const startAt = Temporal.Instant.from(
        item.published_at,
      ).toZonedDateTimeISO(TIME_ZONE)
      const start = startAt.hour * 60 + startAt.minute
      const length = Math.min(
        Math.max(getLengthMinutes(item), MIN_LENGTH_MINUTES),
        MINUTES_IN_DAY - start,
      )

      return { column: 0, columns: 1, item, length, start }
    })
    .sort((a, b) => a.start - b.start || b.length - a.length)

  // Split the videos into clusters of the ones that overlap each other, and
  // give each video the first column that is free at its start
  let cluster: typeof placed = []
  let clusterEnd = 0
  let columnEnds: number[] = []

  const closeCluster = () => {
    for (const layout of cluster) {
      layout.columns = columnEnds.length
    }

    cluster = []
    columnEnds = []
  }

  for (const layout of placed) {
    if (cluster.length > 0 && layout.start >= clusterEnd) {
      closeCluster()
    }

    const end = layout.start + layout.length
    const column = columnEnds.findIndex(
      (columnEnd) => columnEnd <= layout.start,
    )

    layout.column = column === -1 ? columnEnds.length : column
    columnEnds[layout.column] = end
    cluster.push(layout)
    clusterEnd = cluster.length === 1 ? end : Math.max(clusterEnd, end)
  }

  closeCluster()

  return placed
}
