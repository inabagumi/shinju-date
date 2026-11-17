import { PageHeader } from '@shinju-date/ui'
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/widget-error-boundary'
import {
  MaintenanceModePanel,
  MaintenanceModePanelSkeleton,
} from '../_components/maintenance-mode-panel'
import {
  RecentActivity,
  RecentActivitySkeleton,
} from '../_components/recent-activity'
import { getVideoBackfillHistoryAction } from './_actions/video-backfill-history'
import { getVideoBackfillRunAction } from './_actions/video-backfill-run'
import {
  VideoBackfillHistoryPanel,
  VideoBackfillHistoryPanelSkeleton,
} from './_components/video-backfill-history-panel'
import {
  VideoBackfillRunPanel,
  VideoBackfillRunPanelSkeleton,
} from './_components/video-backfill-run-panel'

export const metadata: Metadata = {
  title: 'システム',
}

/**
 * 取得漏れチェックの最初の進捗をサーバーで取得して、パネルに渡す。進捗は刻々と変わる
 * ので、キャッシュせずにリクエストのたびに取得する（`connection()`）。取得できなかったら
 * 例外を投げ、外側の `WidgetErrorBoundary` に任せる
 */
async function VideoBackfillRun() {
  await connection()

  const result = await getVideoBackfillRunAction()

  if (!result.success) {
    throw new Error(result.error)
  }

  return <VideoBackfillRunPanel initialData={result} />
}

/** 過去動画の取り込みの最初の履歴をサーバーで取得して、パネルに渡す */
async function VideoBackfillHistory() {
  await connection()

  const result = await getVideoBackfillHistoryAction()

  if (!result.success) {
    throw new Error(result.error)
  }

  return <VideoBackfillHistoryPanel initialData={result} />
}

export default function SystemPage() {
  return (
    <div>
      <PageHeader title="システム" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WidgetErrorBoundary title="メンテナンスモード">
          <Suspense fallback={<MaintenanceModePanelSkeleton />}>
            <MaintenanceModePanel />
          </Suspense>
        </WidgetErrorBoundary>
        <WidgetErrorBoundary title="最近のアクティビティ">
          <Suspense fallback={<RecentActivitySkeleton />}>
            <RecentActivity />
          </Suspense>
        </WidgetErrorBoundary>
        {/* 幅と、ダッシュボードからのリンク先の `id` は、読み込み中とエラーのときも同じになるよう、パネルの外側に置く */}
        <div className="lg:col-span-2">
          <WidgetErrorBoundary title="取得漏れチェック（全タレント）">
            <Suspense fallback={<VideoBackfillRunPanelSkeleton />}>
              <VideoBackfillRun />
            </Suspense>
          </WidgetErrorBoundary>
        </div>
        <div className="lg:col-span-2" id="video-backfill-history">
          <WidgetErrorBoundary title="過去動画の取り込みの履歴">
            <Suspense fallback={<VideoBackfillHistoryPanelSkeleton />}>
              <VideoBackfillHistory />
            </Suspense>
          </WidgetErrorBoundary>
        </div>
      </div>
    </div>
  )
}
