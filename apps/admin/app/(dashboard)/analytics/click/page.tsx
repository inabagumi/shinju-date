import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import {
  ChartSkeleton,
  DateRangePickerSkeleton,
  ListCardsSkeleton,
  TabNavigationSkeleton,
} from '@/components/skeletons'
import { DateRangePickerClient } from '../_components/date-range-picker-client'
import { VolumeChart } from '../_components/volume-chart'
import { PANEL_CLASS_NAME } from '../_lib/panel'
import { analyticsSearchParamsSchema } from '../_lib/search-params-schema'
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
    <div>
      <PageHeader title="クリックアナリティクス" />

      <div className="mb-8">
        <Suspense fallback={<DateRangePickerSkeleton />}>
          <DateRangePickerClient searchParams={parsedSearchParams} />
        </Suspense>
      </div>

      <section className="mb-8">
        <h2 className="mb-4 text-heading font-bold">クリックボリューム</h2>
        <div className={PANEL_CLASS_NAME}>
          <Suspense fallback={<ChartSkeleton />}>
            <VolumeChart kind="click" searchParams={parsedSearchParams} />
          </Suspense>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-heading font-bold">人気ランキング</h2>
        <div className={PANEL_CLASS_NAME}>
          <Suspense fallback={<TabNavigationSkeleton />}>
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
            <Suspense fallback={<ListCardsSkeleton rows={5} />}>
              <PopularRankingsTabs searchParams={parsedSearchParams} />
            </Suspense>
          </div>
        </div>
      </section>
    </div>
  )
}
