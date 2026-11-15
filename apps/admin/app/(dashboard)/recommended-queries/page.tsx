import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { ManagementTableSkeleton } from '@/components/skeletons'
import { QueriesList } from './_components/queries-list'
import getRecommendedQueries from './_lib/get-recommended-queries'

export const metadata: Metadata = {
  title: 'おすすめクエリ管理',
}

async function QueriesListData() {
  'use cache: private'

  cacheLife('minutes')

  const { manual, auto } = await getRecommendedQueries()

  return <QueriesList autoQueries={auto} manualQueries={manual} />
}

export default function RecommendedQueriesPage() {
  return (
    <div>
      {/* Static header */}
      <PageHeader title="おすすめクエリ管理" />

      {/* Dynamic content with Suspense */}
      <Suspense fallback={<ManagementTableSkeleton rows={8} />}>
        <QueriesListData />
      </Suspense>
    </div>
  )
}
