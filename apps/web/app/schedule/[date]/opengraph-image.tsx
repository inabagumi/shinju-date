import {
  createOgImage,
  OG_IMAGE_CONTENT_TYPE,
  OG_IMAGE_SIZE,
} from '@/lib/og-image'
import { resolveScheduleWeek } from '../_lib/resolve-schedule-week'
import { getScheduleWeekTitle } from '../_lib/week-title'

export const alt = '配信スケジュール'
export const size = OG_IMAGE_SIZE
export const contentType = OG_IMAGE_CONTENT_TYPE

/**
 * The image of the schedule of a week, with the range of the week. The dates
 * that the page does not show are not found, as on the page.
 */
export default async function Image({
  params,
}: Pick<PageProps<'/schedule/[date]'>, 'params'>) {
  const { weekStart } = await resolveScheduleWeek(params)

  return createOgImage(getScheduleWeekTitle(weekStart))
}
