import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AnalyticsPageSkeleton } from '@/components/skeletons'
import { SearchAnalyticsContent } from './_components/search-analytics-content'

export const metadata: Metadata = {
  title: '検索アナリティクス',
}

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function SearchAnalyticsPage({ searchParams }: Props) {
  const params = await searchParams

  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <SearchAnalyticsContent searchParams={params} />
    </Suspense>
  )
}
