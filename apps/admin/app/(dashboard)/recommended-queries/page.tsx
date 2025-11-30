import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
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
      <h1 className="mb-6 font-bold text-3xl">おすすめクエリ</h1>

      {/* Dynamic content with Suspense */}
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-lg bg-gray-200" />}
      >
        <QueriesListData />
      </Suspense>
    </div>
  )
}
