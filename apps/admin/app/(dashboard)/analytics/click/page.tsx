import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AnalyticsPageSkeleton } from '@/components/skeletons'
import { ClickAnalyticsContent } from './_components/click-analytics-content'

export const metadata: Metadata = {
  title: 'クリックアナリティクス',
}

export default function ClickAnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <ClickAnalyticsContent />
    </Suspense>
  )
}
