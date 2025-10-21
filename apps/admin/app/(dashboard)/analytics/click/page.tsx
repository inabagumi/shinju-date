import { Suspense } from 'react'
import { AnalyticsPageSkeleton } from '@/components/skeletons'
import { ClickAnalyticsContent } from './_components/click-analytics-content'

export default function ClickAnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <ClickAnalyticsContent />
    </Suspense>
  )
}
