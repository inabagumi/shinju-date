import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DateRangePickerClient } from '../_components/date-range-picker-client'
import { ServerTabs } from '../_components/server-tabs'
import { ClickVolumeChart } from './_components/click-volume-chart'
import { PopularChannelsWidget } from './_components/popular-channels-widget'
import { PopularVideosWidget } from './_components/popular-videos-widget'

export const metadata: Metadata = {
  title: 'クリックアナリティクス',
}

export default function ClickAnalyticsPage({
  searchParams,
}: PageProps<'/analytics/click'>) {
  return (
    <div className="p-6">
      <h1 className="mb-6 font-bold text-3xl">クリックアナリティクス</h1>

      {/* Date Range Picker Section - Client component for interactivity */}
      <div className="mb-6">
        <DateRangePickerClient searchParams={searchParams} />
      </div>

      {/* Click Volume Chart Section - Independent Async Server Component */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-xl">クリックボリューム</h2>
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
          }
        >
          <ClickVolumeChart searchParams={searchParams} />
        </Suspense>
      </div>

      {/* Popular Rankings Section - Tabbed Interface with Server Components */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <ServerTabs
          defaultTab="videos"
          tabs={[
            {
              content: (
                <Suspense
                  fallback={
                    <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
                  }
                >
                  <PopularVideosWidget searchParams={searchParams} />
                </Suspense>
              ),
              id: 'videos',
              label: '人気動画',
            },
            {
              content: (
                <Suspense
                  fallback={
                    <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
                  }
                >
                  <PopularChannelsWidget searchParams={searchParams} />
                </Suspense>
              ),
              id: 'channels',
              label: '人気チャンネル',
            },
          ]}
        />
      </div>
    </div>
  )
}
