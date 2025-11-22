import { Suspense } from 'react'
import { CardSkeleton } from '@/components/skeletons'
import { AnalyticsWidget } from './_components/analytics-widget'
import {
  PopularVideosWidget,
  PopularVideosWidgetSkeleton,
} from './_components/popular-videos-widget'
import { SummaryWidget } from './_components/summary-widget'
import { VideoStatsChart } from './_components/video-stats-chart'

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 font-bold text-3xl">ダッシュボード</h1>

        {/* Main content area with max-width constraint */}
        <div className="space-y-6">
          {/* Summary Widget - Full width single row */}
          <Suspense fallback={<CardSkeleton />}>
            <SummaryWidget />
          </Suspense>

          {/* Second row: Analytics and Video Stats Chart */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Analytics Summary Widget */}
            <Suspense fallback={<CardSkeleton />}>
              <AnalyticsWidget />
            </Suspense>

            {/* Video Stats Chart */}
            <Suspense fallback={<CardSkeleton />}>
              <VideoStatsChart />
            </Suspense>
          </div>

          {/* Popular Videos - Full width */}
          <Suspense fallback={<PopularVideosWidgetSkeleton />}>
            <PopularVideosWidget />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
