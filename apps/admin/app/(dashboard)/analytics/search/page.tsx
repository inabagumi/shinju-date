import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AnalyticsPageSkeleton } from '@/components/skeletons'
import { SearchAnalyticsContent } from './_components/search-analytics-content'

export const metadata: Metadata = {
  title: '検索アナリティクス',
}

export default function SearchAnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <SearchAnalyticsContent />
    </Suspense>
  )
}
