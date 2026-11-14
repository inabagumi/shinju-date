import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageHeader } from '@/components/page-header'
import { CardSkeleton } from '@/components/skeletons'
import { WidgetErrorBoundary } from '@/components/widget-error-boundary'
import { MaintenanceModePanel } from '../_components/maintenance-mode-panel'
import { RecentActivity } from '../_components/recent-activity'
import { VideoBackfillHistoryPanel } from './_components/video-backfill-history-panel'
import { VideoBackfillRunPanel } from './_components/video-backfill-run-panel'

export const metadata: Metadata = {
  title: 'システム',
}

export default function SystemPage() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <PageHeader title="システム" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WidgetErrorBoundary title="メンテナンスモード">
          <Suspense fallback={<CardSkeleton />}>
            <MaintenanceModePanel />
          </Suspense>
        </WidgetErrorBoundary>
        <WidgetErrorBoundary title="最近のアクティビティ">
          <Suspense fallback={<CardSkeleton />}>
            <RecentActivity />
          </Suspense>
        </WidgetErrorBoundary>
        <WidgetErrorBoundary title="取得漏れチェック（全タレント）">
          <VideoBackfillRunPanel />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary
          id="video-backfill-history"
          title="過去動画の取り込みの履歴"
        >
          <VideoBackfillHistoryPanel />
        </WidgetErrorBoundary>
      </div>
    </div>
  )
}
