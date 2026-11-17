import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { QueriesList, QueriesListSkeleton } from './_components/queries-list'
import getRecommendedQueries from './_lib/get-recommended-queries'

export const metadata: Metadata = {
  title: 'おすすめクエリ管理',
}

async function QueriesListData() {
  const { manual, auto } = await getRecommendedQueries()

  return <QueriesList autoQueries={auto} manualQueries={manual} />
}

export default function RecommendedQueriesPage() {
  return (
    <div>
      {/* Static header */}
      <PageHeader title="おすすめクエリ管理" />

      {/* Dynamic content with Suspense */}
      <Suspense fallback={<QueriesListSkeleton />}>
        <QueriesListData />
      </Suspense>
    </div>
  )
}
