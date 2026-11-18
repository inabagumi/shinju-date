import { PageHeader } from "@shinju-date/ui";
import type { Metadata } from "next";
import { Suspense } from "react";

import { WidgetErrorBoundary } from "@/components/widget-error-boundary";

import {
  RecentActivity,
  RecentActivitySkeleton,
} from "../_components/recent-activity";
import {
  MaintenanceModePanel,
  MaintenanceModePanelSkeleton,
} from "./_components/maintenance-mode-panel";
import {
  VideoBackfillHistoryPanel,
  VideoBackfillHistoryPanelSkeleton,
} from "./_components/video-backfill-history-panel";
import {
  VideoBackfillRunPanel,
  VideoBackfillRunPanelSkeleton,
} from "./_components/video-backfill-run-panel";
import { getVideoBackfillHistory } from "./_lib/get-video-backfill-history";
import { getVideoBackfillRun } from "./_lib/get-video-backfill-run";

export const metadata: Metadata = {
  title: "システム",
};

/** 取得漏れチェックの最初の進捗をサーバーで取得して、パネルに渡す */
async function VideoBackfillRun() {
  const initialData = await getVideoBackfillRun();

  return <VideoBackfillRunPanel initialData={initialData} />;
}

/** 過去動画の取り込みの最初の履歴をサーバーで取得して、パネルに渡す */
async function VideoBackfillHistory() {
  const initialData = await getVideoBackfillHistory();

  return <VideoBackfillHistoryPanel initialData={initialData} />;
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
  );
}
