import { SITE_NAME as siteName } from '@shinju-date/constants'
import type { Metadata } from 'next'
import { getSchedulePath } from '@/lib/schedule'
import SchedulePageContent from './_components/schedule-page-content'

const title = '配信スケジュール'

export const metadata: Metadata = {
  alternates: {
    canonical: getSchedulePath(),
  },
  openGraph: {
    siteName,
    title,
    type: 'article',
  },
  title,
  twitter: {
    title: `${title} - ${siteName}`,
  },
}

/** 今日（`TIME_ZONE`）を含む週の配信スケジュール */
export default function SchedulePage() {
  return <SchedulePageContent />
}
