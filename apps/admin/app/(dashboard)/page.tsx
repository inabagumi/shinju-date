import { PageHeader } from '@shinju-date/ui'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/widget-error-boundary'
import {
  AnalyticsWidget,
  AnalyticsWidgetSkeleton,
} from './_components/analytics-widget'
import {
  DashboardPopularVideos,
  DashboardPopularVideosSkeleton,
} from './_components/dashboard-popular-videos'
import {
  ContentSummaryWidget,
  ContentSummaryWidgetSkeleton,
  VideoSummaryWidget,
  VideoSummaryWidgetSkeleton,
} from './_components/summary-widget'
import { VideoBackfillFailureAlert } from './_components/video-backfill-failure-alert'

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="ダッシュボード" />

      {/* Main content area with max-width constraint */}
      <div className="space-y-6">
        {/* Failed backfills that need attention; nothing while there are none */}
        <Suspense fallback={null}>
          <VideoBackfillFailureAlert />
        </Suspense>

        {/* Video Summary - Full width */}
        <WidgetErrorBoundary title="動画サマリー">
          <Suspense fallback={<VideoSummaryWidgetSkeleton />}>
            <VideoSummaryWidget />
          </Suspense>
        </WidgetErrorBoundary>

        {/* Second row: Content Summary and Analytics */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Content Summary Widget */}
          <WidgetErrorBoundary title="コンテンツサマリー">
            <Suspense fallback={<ContentSummaryWidgetSkeleton />}>
              <ContentSummaryWidget />
            </Suspense>
          </WidgetErrorBoundary>

          {/* Analytics Summary Widget */}
          <WidgetErrorBoundary title="アナリティクス">
            <Suspense fallback={<AnalyticsWidgetSkeleton />}>
              <AnalyticsWidget />
            </Suspense>
          </WidgetErrorBoundary>
        </div>

        {/* Popular Videos - Full width */}
        <WidgetErrorBoundary title="人気動画ランキング (過去30日間)">
          <Suspense fallback={<DashboardPopularVideosSkeleton />}>
            <DashboardPopularVideos />
          </Suspense>
        </WidgetErrorBoundary>
      </div>
    </div>
  )
}
