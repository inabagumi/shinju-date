import { SITE_NAME as siteName } from '@shinju-date/constants'
import type { Metadata } from 'next'
import { formatWeekRange, getSchedulePath } from '@/lib/schedule'
import SchedulePageContent from '../_components/schedule-page-content'
import { resolveScheduleWeek } from '../_lib/resolve-schedule-week'

export async function generateMetadata({
  params,
}: Pick<PageProps<'/schedule/[date]'>, 'params'>): Promise<Metadata> {
  const { weekStart } = await resolveScheduleWeek(params)
  const title = `${formatWeekRange(weekStart)}の配信スケジュール`

  return {
    alternates: {
      // 月曜以外の日付でも、その週の月曜の URL を正規の URL にする
      canonical: getSchedulePath(weekStart),
    },
    openGraph: {
      siteName,
      title,
      type: 'article',
    },
    robots: {
      // 検索エンジンには `/schedule` だけを載せる
      index: false,
    },
    title,
    twitter: {
      title: `${title} - ${siteName}`,
    },
  }
}

/**
 * その日を含む週（月曜〜日曜）の配信スケジュール。`params` は Suspense の中の
 * 各部品で読み、日付として読めない値では各部品が `notFound()` を呼ぶ。
 */
export default function ScheduleWeekPage({
  params,
}: PageProps<'/schedule/[date]'>) {
  return <SchedulePageContent params={params} />
}
