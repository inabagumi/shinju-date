import { formatWeekRange } from '@/lib/schedule'

/**
 * The title of the schedule of the week that starts on `weekStart`, for the
 * page and its Open Graph image.
 */
export function getScheduleWeekTitle(weekStart: Temporal.PlainDate): string {
  return `${formatWeekRange(weekStart)}の配信スケジュール`
}
