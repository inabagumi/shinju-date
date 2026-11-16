import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  ChartSkeleton,
  DateRangePickerSkeleton,
  MetricCardSkeleton,
} from '@/components/skeletons'
import { DateRangePickerClient } from '../_components/date-range-picker-client'
import { VolumeChart } from '../_components/volume-chart'
import { PANEL_CLASS_NAME } from '../_lib/panel'
import { analyticsSearchParamsSchema } from '../_lib/search-params-schema'
import { PopularKeywordsWidget } from './_components/popular-keywords-widget'
import { RepeatSearchRateWidget } from './_components/repeat-search-rate-widget'
import { SearchEngagementRateWidget } from './_components/search-engagement-rate-widget'
import { SearchExitRateWidget } from './_components/search-exit-rate-widget'
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
    <div>
      <PageHeader title="検索アナリティクス" />

      <div className="mb-8">
        <Suspense fallback={<DateRangePickerSkeleton />}>
          <DateRangePickerClient searchParams={parsedSearchParams} />
        </Suspense>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 text-heading font-bold">検索ボリューム</h2>
        <div className={PANEL_CLASS_NAME}>
          <Suspense fallback={<ChartSkeleton />}>
            <VolumeChart kind="search" searchParams={parsedSearchParams} />
          </Suspense>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-heading font-bold">検索品質指標</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className={PANEL_CLASS_NAME}>
            <Suspense fallback={<MetricCardSkeleton />}>
              <SearchEngagementRateWidget searchParams={parsedSearchParams} />
            </Suspense>
          </div>

          <div className={PANEL_CLASS_NAME}>
            <Suspense fallback={<MetricCardSkeleton />}>
              <RepeatSearchRateWidget searchParams={parsedSearchParams} />
            </Suspense>
          </div>

          <div className={`${PANEL_CLASS_NAME} lg:col-span-2`}>
            <Suspense fallback={<MetricCardSkeleton />}>
              <SearchExitRateWidget searchParams={parsedSearchParams} />
            </Suspense>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-heading font-bold">従来の検索指標</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className={PANEL_CLASS_NAME}>
            <Suspense fallback={<MetricCardSkeleton />}>
              <ZeroResultKeywordsWidget />
            </Suspense>
          </div>

          <div className={PANEL_CLASS_NAME}>
            <Suspense fallback={<MetricCardSkeleton />}>
              <PopularKeywordsWidget searchParams={parsedSearchParams} />
            </Suspense>
          </div>
        </div>
      </section>
    </div>
  )
}
