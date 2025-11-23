import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DateRangePickerClient } from '../_components/date-range-picker-client'
import { analyticsSearchParamsSchema } from '../_lib/search-params-schema'
import { ClickVolumeChart } from './_components/click-volume-chart'
import { PopularRankingsTabs } from './_components/popular-rankings-tabs'
import { TabNavigation } from './_components/tab-navigation'

export const metadata: Metadata = {
  title: 'クリックアナリティクス',
}

export default function ClickAnalyticsPage({
  searchParams,
}: PageProps<'/analytics/click'>) {
  const parsedSearchParams = searchParams.then((params) =>
    analyticsSearchParamsSchema.parse(params),
  )

  return (
    <div className="p-6">
      <h1 className="mb-6 font-bold text-3xl">クリックアナリティクス</h1>

      <div className="mb-6">
        <Suspense
          fallback={
            <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
          }
        >
          <DateRangePickerClient searchParams={parsedSearchParams} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-semibold text-xl">クリックボリューム</h2>
          <Suspense
            fallback={
              <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
            }
          >
            <ClickVolumeChart searchParams={parsedSearchParams} />
          </Suspense>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <Suspense
            fallback={
              <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
            }
          >
            <TabNavigation
              defaultTab="videos"
              searchParams={parsedSearchParams}
              tabs={[
                { id: 'videos', label: '人気動画' },
                { id: 'talents', label: '人気タレント' },
              ]}
            />
          </Suspense>
          <div className="mt-6">
            <Suspense
              fallback={
                <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
              }
            >
              <PopularRankingsTabs searchParams={parsedSearchParams} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
