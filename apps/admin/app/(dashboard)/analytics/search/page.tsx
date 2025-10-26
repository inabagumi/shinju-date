import type { Metadata } from 'next'
import { Suspense } from 'react'
import { DateRangePickerClient } from '../_components/date-range-picker-client'
import { PopularKeywordsWidgetServer } from './_components/popular-keywords-widget-server'
import { SearchVolumeChartServer } from './_components/search-volume-chart-server'
import { ZeroResultKeywordsWidgetServer } from './_components/zero-result-keywords-widget-server'

export const metadata: Metadata = {
  title: '検索アナリティクス',
}

type Props = {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default function SearchAnalyticsPage({ searchParams }: Props) {
  return (
    <div className="p-6">
      <h1 className="mb-6 font-bold text-3xl">検索アナリティクス</h1>

      {/* Date Range Picker Section - Client component for interactivity */}
      <div className="mb-6">
        <DateRangePickerClient searchParams={searchParams} />
      </div>

      {/* Search Volume Chart Section - Independent Async Server Component */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-xl">検索ボリューム</h2>
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
          }
        >
          <SearchVolumeChartServer searchParams={searchParams} />
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
          <PopularKeywordsWidgetServer searchParams={searchParams} />
        </Suspense>
      </div>

      {/* Zero Result Keywords Section - Independent Async Server Component */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-xl">検索結果0件のキーワード</h2>
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
          }
        >
          <ZeroResultKeywordsWidgetServer />
        </Suspense>
      </div>
    </div>
  )
}
