import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { Suspense } from 'react'
import { QueriesList } from './_components/queries-list'
import getRecommendedQueries from './_lib/get-recommended-queries'

export const metadata: Metadata = {
  title: 'おすすめクエリ',
}

async function QueriesContent() {
  'use cache: private'
  cacheLife('minutes')

  const { manual, auto } = await getRecommendedQueries()

  return <QueriesList autoQueries={auto} manualQueries={manual} />
}

export default function RecommendedQueriesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
        </div>
      }
    >
      <QueriesContent />
    </Suspense>
  )
}
