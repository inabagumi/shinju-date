import { Skeleton } from "@shinju-date/ui";

import { Panel, PanelSkeleton } from "@/components/panel";
import { StatTileSkeleton } from "@/components/stat-tile-skeleton";

import {
  CHART_PERIODS,
  DEFAULT_CHART_PERIOD,
  getRequiredSnapshotDays,
  MAX_CHART_PERIOD,
} from "../_lib/chart-periods";
import { getHistoricalStats } from "../_lib/get-historical-stats";
import { getSummaryStats } from "../_lib/get-summary-stats";
import {
  COUNT_CHART_NOTE,
  COUNT_CHARTS,
  getCountChartTitle,
  getNetChangeChartTitle,
  NET_CHANGE_CHART_DESCRIPTION,
} from "../_lib/video-summary-charts";
import {
  getVideoListHref,
  VIDEO_SUMMARY_FILTERS,
} from "../_lib/video-summary-filters";
import { StatTileLink } from "./trend-indicator";
import { VideoSummaryCharts } from "./video-summary-charts";

/**
 * VideoSummaryWidget - Displays video statistics with the daily net changes
 * of the total of the videos and the counts of the scheduled and the hidden
 * videos for the period chosen (7 or 30 days).
 * This is an async Server Component that fetches its own data. The snapshots
 * of the longest period are read at once, so switching the period does not
 * read them again.
 */
export const VideoSummaryWidget = async () => {
  const [stats, history] = await Promise.all([
    getSummaryStats(),
    // The day before the first day is the base of the first change
    getHistoricalStats(getRequiredSnapshotDays(MAX_CHART_PERIOD)),
  ]);

  return (
    <Panel title="動画サマリー">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTileLink
          dayChange={stats.totalVideos.dayChange}
          href={getVideoListHref(VIDEO_SUMMARY_FILTERS.totalVideos)}
          label="総動画数"
          value={stats.totalVideos.current}
        />
        <StatTileLink
          dayChange={stats.visibleVideos.dayChange}
          href={getVideoListHref(VIDEO_SUMMARY_FILTERS.visibleVideos)}
          label="公開中"
          value={stats.visibleVideos.current}
        />
        <StatTileLink
          dayChange={stats.scheduledVideos.dayChange}
          href={getVideoListHref(VIDEO_SUMMARY_FILTERS.scheduledVideos)}
          label="配信予定"
          value={stats.scheduledVideos.current}
        />
        <StatTileLink
          dayChange={stats.hiddenVideos.dayChange}
          href={getVideoListHref(VIDEO_SUMMARY_FILTERS.hiddenVideos)}
          label="非表示"
          value={stats.hiddenVideos.current}
        />
      </div>

      <VideoSummaryCharts history={history} />
    </Panel>
  );
};

/**
 * 読み込み中の `VideoSummaryWidget`。4つのタイルと、期間のボタン、最初の期間のグラフの
 * 高さを確保する
 */
export const VideoSummaryWidgetSkeleton = () => (
  <PanelSkeleton title="動画サマリー">
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTileSkeleton change />
      <StatTileSkeleton change />
      <StatTileSkeleton change />
      <StatTileSkeleton change />
    </div>
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <span className="text-meta text-muted">グラフの期間</span>
      <div className="flex gap-2">
        {CHART_PERIODS.map((period) => (
          <Skeleton className="h-7 w-24 rounded-control" key={period} />
        ))}
      </div>
    </div>
    <div className="mt-6">
      <h3 className="text-body leading-normal font-semibold">
        {getNetChangeChartTitle(DEFAULT_CHART_PERIOD)}
      </h3>
      <p className="mb-3 text-meta text-muted">
        {NET_CHANGE_CHART_DESCRIPTION}
      </p>
      <Skeleton className="h-80 w-full rounded-container" />
    </div>
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      {COUNT_CHARTS.map((chart) => (
        <section key={chart.key}>
          <h3 className="text-body leading-normal font-semibold">
            {getCountChartTitle(chart, DEFAULT_CHART_PERIOD)}
          </h3>
          <p className="mb-3 text-meta text-muted">{chart.description}</p>
          <Skeleton className="h-48 w-full rounded-container" />
        </section>
      ))}
    </div>
    <p className="mt-3 text-meta text-muted">{COUNT_CHART_NOTE}</p>
  </PanelSkeleton>
);

/**
 * ContentSummaryWidget - Displays content statistics (terms and talents)
 * This is an async Server Component that fetches its own data
 */
export const ContentSummaryWidget = async () => {
  const stats = await getSummaryStats();

  return (
    <Panel title="コンテンツサマリー">
      <div className="grid grid-cols-2 gap-4">
        <StatTileLink
          dayChange={stats.totalTerms.dayChange}
          href="/terms"
          label="総用語数"
          value={stats.totalTerms.current}
        />
        <StatTileLink
          dayChange={stats.totalTalents.dayChange}
          href="/talents"
          label="総タレント数"
          value={stats.totalTalents.current}
        />
      </div>
    </Panel>
  );
};

/** 読み込み中の `ContentSummaryWidget` */
export const ContentSummaryWidgetSkeleton = () => (
  <PanelSkeleton title="コンテンツサマリー">
    <div className="grid grid-cols-2 gap-4">
      <StatTileSkeleton change />
      <StatTileSkeleton change />
    </div>
  </PanelSkeleton>
);
