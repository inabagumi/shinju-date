import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DateRangePickerClient } from '../_components/date-range-picker-client'
import { analyticsSearchParamsSchema } from '../_lib/search-params-schema'
import { PopularKeywordsWidget } from './_components/popular-keywords-widget'
import { RepeatSearchRateWidget } from './_components/repeat-search-rate-widget'
import { SearchEngagementRateWidget } from './_components/search-engagement-rate-widget'
import { SearchExitRateWidget } from './_components/search-exit-rate-widget'
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
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-6 font-bold text-3xl">検索アナリティクス</h1>

      <div className="mb-6">
        <Suspense
          fallback={
            <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
          }
        >
          <DateRangePickerClient searchParams={parsedSearchParams} />
        </Suspense>
      </div>

      {/* Search Volume Chart */}
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

      {/* New Search Quality Metrics Section */}
      <div className="mb-6">
        <h2 className="mb-4 font-semibold text-2xl text-774-blue-700">
          検索品質指標
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <Suspense
              fallback={
                <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
              }
            >
              <SearchEngagementRateWidget searchParams={parsedSearchParams} />
            </Suspense>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <Suspense
              fallback={
                <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
              }
            >
              <RepeatSearchRateWidget searchParams={parsedSearchParams} />
            </Suspense>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-1">
            <Suspense
              fallback={
                <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
              }
            >
              <SearchExitRateWidget searchParams={parsedSearchParams} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Existing Analytics Section */}
      <div className="mb-6">
        <h2 className="mb-4 font-semibold text-2xl text-gray-700">
          従来の検索指標
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <Suspense
              fallback={
                <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
              }
            >
              <ZeroResultKeywordsWidget />
            </Suspense>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <Suspense
              fallback={
                <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
              }
            >
              <PopularKeywordsWidget searchParams={parsedSearchParams} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
