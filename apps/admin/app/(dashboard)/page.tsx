import Link from 'next/link'
import { Suspense } from 'react'
import { CardSkeleton } from '@/components/skeletons'
import { AnalyticsWidget } from './_components/analytics-widget'
import {
  PopularVideosWidget,
  PopularVideosWidgetSkeleton,
} from './_components/popular-videos-widget'
import { SummaryWidget } from './_components/summary-widget'

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="mb-6 font-bold text-3xl">ダッシュボード</h1>

      {/* Grid layout for widgets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[repeat(auto-fit,minmax(var(--widget-min-width),1fr))]">
        {/* Summary Widget */}
        <Suspense fallback={<CardSkeleton />}>
          <SummaryWidget />
        </Suspense>

        {/* Analytics Summary Widget */}
        <Suspense fallback={<CardSkeleton />}>
          <AnalyticsWidget />
        </Suspense>

        {/* Quick Access Widget - Static, no Suspense needed */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-xl">クイックアクセス</h2>
          <div className="flex flex-col gap-3">
            <Link
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
              href="/videos"
            >
              <span className="font-medium">動画を管理する</span>
            </Link>
            <Link
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
              href="/terms"
            >
              <span className="font-medium">用語集を編集する</span>
            </Link>
            <Link
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
              href="/analytics/search"
            >
              <span className="font-medium">検索アナリティクス</span>
            </Link>
            <Link
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
              href="/analytics/click"
            >
              <span className="font-medium">クリックアナリティクス</span>
            </Link>
            <a
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-center transition-colors hover:bg-gray-50"
              href="https://shinju.date"
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="font-medium">公開サイトを確認する</span>
              <span className="ml-1 text-gray-500 text-sm">↗</span>
            </a>
          </div>
        </div>

        {/* Popular Videos Widget - Full width */}
        <Suspense fallback={<PopularVideosWidgetSkeleton />}>
          <PopularVideosWidget />
        </Suspense>
      </div>
    </div>
  )
}
