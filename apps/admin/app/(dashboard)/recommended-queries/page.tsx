import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { QueriesList, QueriesListSkeleton } from './_components/queries-list'
import { filterQueries } from './_lib/filter-queries'
import getRecommendedQueries from './_lib/get-recommended-queries'
import { recommendedQueriesSearchParamsSchema } from './_lib/search-params-schema'

export const metadata: Metadata = {
  title: 'おすすめクエリ管理',
}

async function QueriesListData({
  searchParams,
}: Pick<PageProps<'/recommended-queries'>, 'searchParams'>) {
  const [{ manual, auto }, rawParams] = await Promise.all([
    getRecommendedQueries(),
    searchParams,
  ])
  const { search } = recommendedQueriesSearchParamsSchema.parse(rawParams)

  return (
    <QueriesList
      autoQueries={filterQueries(auto, search, (item) => item.query)}
      autoTotal={auto.length}
      manualQueries={filterQueries(manual, search, (query) => query)}
      manualTotal={manual.length}
      search={search}
    />
  )
}

export default function RecommendedQueriesPage({
  searchParams,
}: PageProps<'/recommended-queries'>) {
  return (
    <div>
      {/* Static header */}
      <PageHeader title="おすすめクエリ管理" />

      {/* Dynamic content with Suspense */}
      <Suspense fallback={<QueriesListSkeleton />}>
        <QueriesListData searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
