import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { ManagementTableSkeleton } from '@/components/skeletons'
import { QueriesList } from './_components/queries-list'
import getRecommendedQueries from './_lib/get-recommended-queries'

export const metadata: Metadata = {
  title: 'おすすめクエリ',
}

async function QueriesListData() {
  'use cache: private'
  cacheLife('minutes')

  const { manual, auto } = await getRecommendedQueries()

  return <QueriesList autoQueries={auto} manualQueries={manual} />
}

export default function RecommendedQueriesPage() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Static header */}
      <h1 className="mb-6 text-3xl font-bold">おすすめクエリ</h1>

      {/* Dynamic content with Suspense */}
      <Suspense fallback={<ManagementTableSkeleton rows={8} />}>
        <QueriesListData />
      </Suspense>
    </div>
  )
}
