import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DateRangePickerClient } from '../_components/date-range-picker-client'
import { ClickVolumeChartServer } from './_components/click-volume-chart-server'
import { PopularChannelsWidgetServer } from './_components/popular-channels-widget-server'
import { PopularVideosWidgetServer } from './_components/popular-videos-widget-server'

export const metadata: Metadata = {
  title: 'クリックアナリティクス',
}

type Props = {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default function ClickAnalyticsPage({ searchParams }: Props) {
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
          <ClickVolumeChartServer searchParams={searchParams} />
        </Suspense>
      </div>

      {/* Popular Videos Section - Independent Async Server Component */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-xl">人気動画ランキング</h2>
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
          }
        >
          <PopularVideosWidgetServer searchParams={searchParams} />
        </Suspense>
      </div>

      {/* Popular Channels Section - Independent Async Server Component */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-xl">人気チャンネルランキング</h2>
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
          }
        >
          <PopularChannelsWidgetServer searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  )
}
