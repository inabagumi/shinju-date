import { notFound } from 'next/navigation'
import { fetchOldestVideoDate, fetchScheduleToday } from '@/lib/fetchers'
import {
  getScheduleWeekRange,
  getWeekStart,
  isWeekInRange,
  parseScheduleDate,
  type ScheduleWeekRange,
} from '@/lib/schedule'

/**
 * `params` of `/schedule/[date]`. `/schedule` has none, and shows the week
 * that includes today.
 */
export type SchedulePageParams = PageProps<'/schedule/[date]'>['params']

export interface ScheduleWeek {
  /** The weeks that can be shown. Links to the other weeks are not shown */
  range: ScheduleWeekRange
  /** Today in `TIME_ZONE`, at the time `fetchScheduleToday` was cached */
  today: Temporal.PlainDate
  /** The Monday of the week the page shows */
  weekStart: Temporal.PlainDate
}

/**
 * The week the page shows. This renders the not-found page for a date that
 * cannot be read, a week before the week of the oldest video, and a week more
 * than `SCHEDULE_WEEKS_AHEAD` weeks after the current week.
 *
 * Each section of the page calls this inside its own `<Suspense>`. The
 * fetchers are cached, so they run only once.
 */
export async function resolveScheduleWeek(
  params?: SchedulePageParams | undefined,
): Promise<ScheduleWeek> {
  let day: Temporal.PlainDate | null = null

  if (params) {
    const { date } = await params

    day = parseScheduleDate(date)

    if (!day) {
      notFound()
    }
  }

  const [todayValue, oldestValue] = await Promise.all([
    fetchScheduleToday(),
    fetchOldestVideoDate(),
  ])
  const today = Temporal.PlainDate.from(todayValue)
  const range = getScheduleWeekRange({
    oldestDate: oldestValue ? Temporal.PlainDate.from(oldestValue) : null,
    today,
  })
  const weekStart = getWeekStart(day ?? today)

  if (!isWeekInRange(weekStart, range)) {
    notFound()
  }

  return { range, today, weekStart }
}
