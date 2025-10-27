import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DateRangePickerClient } from '../_components/date-range-picker-client'
import { analyticsSearchParamsSchema } from '../_lib/search-params-schema'
import { PopularKeywordsWidget } from './_components/popular-keywords-widget'
import { SearchVolumeChart } from './_components/search-volume-chart'
import { ZeroResultKeywordsWidget } from './_components/zero-result-keywords-widget'

export const metadata: Metadata = {
  title: '検索アナリティクス',
}

export default function SearchAnalyticsPage({
  searchParams,
}: PageProps<'/analytics/search'>) {
  const parsedSearchParams = searchParams.then((params) =>
    analyticsSearchParamsSchema.parse(params),
  )

  return (
    <div className="p-6">
      <h1 className="mb-6 font-bold text-3xl">検索アナリティクス</h1>

      {/* Date Range Picker Section - Client component for interactivity */}
      <div className="mb-6">
        <DateRangePickerClient searchParams={parsedSearchParams} />
      </div>

      {/* Search Volume Chart Section - Independent Async Server Component */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-xl">検索ボリューム</h2>
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
          }
        >
          <SearchVolumeChart searchParams={parsedSearchParams} />
        </Suspense>
      </div>

      {/* Popular Keywords Section - Independent Async Server Component */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-xl">人気検索キーワード</h2>
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
          }
        >
          <PopularKeywordsWidget searchParams={parsedSearchParams} />
        </Suspense>
      </div>

      {/* Zero Result Keywords Section - Independent Async Server Component */}
      {/* Note: Zero result keywords are not date-filtered, so no searchParams needed */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-xl">検索結果0件のキーワード</h2>
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
          }
        >
          <ZeroResultKeywordsWidget />
        </Suspense>
      </div>
    </div>
  )
}
