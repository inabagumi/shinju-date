import { TIME_ZONE } from '@shinju-date/constants'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { getWeekStart, parseScheduleDate } from '@/lib/schedule'

/**
 * `params` of `/schedule/[date]`. `/schedule` has none, and shows the week
 * that includes today.
 */
export type SchedulePageParams = PageProps<'/schedule/[date]'>['params']

/**
 * The Monday of the week the page shows. For a date that cannot be read, this
 * renders the not-found page.
 *
 * Each section of the page calls this inside its own `<Suspense>`, so the
 * heading and the frame of the week navigation stay in the static shell.
 */
export async function resolveScheduleWeek(
  params?: SchedulePageParams | undefined,
): Promise<Temporal.PlainDate> {
  if (!params) {
    // Today depends on the time of the request, not on that of the prerender
    await connection()

    return getWeekStart(
      Temporal.Now.instant().toZonedDateTimeISO(TIME_ZONE).toPlainDate(),
    )
  }

  const { date } = await params
  const day = parseScheduleDate(date)

  if (!day) {
    notFound()
  }

  return getWeekStart(day)
}
