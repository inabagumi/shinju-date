import { Suspense } from 'react'
import { PageHeader } from '@/components/page-header'
import { CardSkeleton } from '@/components/skeletons'
import { WidgetErrorBoundary } from '@/components/widget-error-boundary'
import { AnalyticsWidget } from './_components/analytics-widget'
import {
  PopularVideosWidget,
  PopularVideosWidgetSkeleton,
} from './_components/popular-videos-widget'
import {
  ContentSummaryWidget,
  VideoSummaryWidget,
} from './_components/summary-widget'
import { VideoBackfillFailureAlert } from './_components/video-backfill-failure-alert'

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <PageHeader title="ダッシュボード" />

      {/* Main content area with max-width constraint */}
      <div className="space-y-6">
        {/* Failed backfills that need attention; nothing while there are none */}
        <Suspense fallback={null}>
          <VideoBackfillFailureAlert />
        </Suspense>

        {/* Video Summary - Full width */}
        <WidgetErrorBoundary title="動画サマリー">
          <Suspense fallback={<CardSkeleton />}>
            <VideoSummaryWidget />
          </Suspense>
        </WidgetErrorBoundary>

        {/* Second row: Content Summary and Analytics */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Content Summary Widget */}
          <WidgetErrorBoundary title="コンテンツサマリー">
            <Suspense fallback={<CardSkeleton />}>
              <ContentSummaryWidget />
            </Suspense>
          </WidgetErrorBoundary>

          {/* Analytics Summary Widget */}
          <WidgetErrorBoundary title="アナリティクス">
            <Suspense fallback={<CardSkeleton />}>
              <AnalyticsWidget />
            </Suspense>
          </WidgetErrorBoundary>
        </div>

        {/* Popular Videos - Full width */}
        <WidgetErrorBoundary title="人気動画ランキング (過去30日間)">
          <Suspense fallback={<PopularVideosWidgetSkeleton />}>
            <PopularVideosWidget />
          </Suspense>
        </WidgetErrorBoundary>
      </div>
    </div>
  )
}
