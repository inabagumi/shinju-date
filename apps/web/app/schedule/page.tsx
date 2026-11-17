import { createPageMetadata } from '@/lib/metadata'
import { getSchedulePath } from '@/lib/schedule'
import SchedulePageContent from './_components/schedule-page-content'

export const metadata = createPageMetadata({
  path: getSchedulePath(),
  title: '配信スケジュール',
  type: 'article',
})

/** 今日（`TIME_ZONE`）を含む週の配信スケジュール */
export default function SchedulePage() {
  return <SchedulePageContent />
}
