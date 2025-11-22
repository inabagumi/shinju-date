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
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 font-bold text-3xl">ダッシュボード</h1>

        {/* Main content area with max-width constraint */}
        <div className="space-y-6">
          {/* Top row: Summary and Analytics widgets */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Summary Widgets - Video and Content Summary (2 columns) */}
            <Suspense
              fallback={
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              }
            >
              <SummaryWidget />
            </Suspense>

            {/* Analytics Summary Widget (1 column) */}
            <Suspense fallback={<CardSkeleton />}>
              <AnalyticsWidget />
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
