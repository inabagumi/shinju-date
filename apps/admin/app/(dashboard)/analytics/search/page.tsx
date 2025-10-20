import { Suspense } from 'react'
import { AnalyticsPageSkeleton } from '@/components/skeletons'
import { SearchAnalyticsContent } from './_components/search-analytics-content'

export default function SearchAnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <SearchAnalyticsContent />
    </Suspense>
  )
}
