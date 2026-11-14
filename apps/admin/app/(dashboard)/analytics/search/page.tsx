import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageHeader } from '@/components/page-header'
import {
  ChartSkeleton,
  DateRangePickerSkeleton,
  MetricCardSkeleton,
} from '@/components/skeletons'
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
      <PageHeader title="検索アナリティクス" />

      <div className="mb-6">
        <Suspense fallback={<DateRangePickerSkeleton />}>
          <DateRangePickerClient searchParams={parsedSearchParams} />
        </Suspense>
      </div>

      {/* Search Volume Chart */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">検索ボリューム</h2>
        <Suspense fallback={<ChartSkeleton />}>
          <SearchVolumeChart searchParams={parsedSearchParams} />
        </Suspense>
      </div>

      {/* New Search Quality Metrics Section */}
      <section className="mb-8">
        <h2 className="mb-4 text-heading font-bold">検索品質指標</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <Suspense fallback={<MetricCardSkeleton />}>
              <SearchEngagementRateWidget searchParams={parsedSearchParams} />
            </Suspense>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <Suspense fallback={<MetricCardSkeleton />}>
              <RepeatSearchRateWidget searchParams={parsedSearchParams} />
            </Suspense>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-1">
            <Suspense fallback={<MetricCardSkeleton />}>
              <SearchExitRateWidget searchParams={parsedSearchParams} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Existing Analytics Section */}
      <section>
        <h2 className="mb-4 text-heading font-bold">従来の検索指標</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <Suspense fallback={<MetricCardSkeleton />}>
              <ZeroResultKeywordsWidget />
            </Suspense>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <Suspense fallback={<MetricCardSkeleton />}>
              <PopularKeywordsWidget searchParams={parsedSearchParams} />
            </Suspense>
          </div>
        </div>
      </section>
    </div>
  )
}
