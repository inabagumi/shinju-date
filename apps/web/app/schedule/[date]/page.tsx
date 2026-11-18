import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/metadata'
import { getSchedulePath } from '@/lib/schedule'
import SchedulePageContent from '../_components/schedule-page-content'
import { resolveScheduleWeek } from '../_lib/resolve-schedule-week'
import { getScheduleWeekTitle } from '../_lib/week-title'

export async function generateMetadata({
  params,
}: Pick<PageProps<'/schedule/[date]'>, 'params'>): Promise<Metadata> {
  const { weekStart } = await resolveScheduleWeek(params)

  return createPageMetadata({
    // 検索エンジンには `/schedule` だけを載せる
    index: false,
    // 日曜以外の日付でも、その週の日曜の URL を正規の URL にする
    path: getSchedulePath(weekStart),
    title: getScheduleWeekTitle(weekStart),
    type: 'article',
  })
}

/**
 * その日を含む週（日曜〜土曜）の配信スケジュール。`params` は Suspense の中の
 * 各部品で読み、日付として読めない値では各部品が `notFound()` を呼ぶ。
 */
export default function ScheduleWeekPage({
  params,
}: PageProps<'/schedule/[date]'>) {
  return <SchedulePageContent params={params} />
}
