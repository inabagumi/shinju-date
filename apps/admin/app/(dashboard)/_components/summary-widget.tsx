import { Skeleton } from "@shinju-date/ui";

import { Panel, PanelSkeleton } from "@/components/panel";
import { StatTileSkeleton } from "@/components/stat-tile-skeleton";

import { getHistoricalStats } from "../_lib/get-historical-stats";
import { getSummaryStats } from "../_lib/get-summary-stats";
import {
  getVideoListHref,
  VIDEO_SUMMARY_FILTERS,
} from "../_lib/video-summary-filters";
import { StatTileLink } from "./trend-indicator";
import { VideoStatsChartEmpty } from "./video-stats-chart-empty";
import { VideoStatsChartUI } from "./video-stats-chart-ui";

/**
 * VideoSummaryWidget - Displays video statistics with 7-day chart
 * This is an async Server Component that fetches its own data
 */
export const VideoSummaryWidget = async () => {
  const [stats, historicalStats] = await Promise.all([
    getSummaryStats(),
    getHistoricalStats(7),
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

      {/* 7-Day Video Stats Chart */}
      <div className="mt-6">
        <h3 className="mb-3 text-body leading-normal font-semibold">
          動画数推移（7日間）
        </h3>
        {historicalStats.length === 0 ? (
          <VideoStatsChartEmpty />
        ) : (
          <VideoStatsChartUI data={historicalStats} />
        )}
      </div>
    </Panel>
  );
};

/** 読み込み中の `VideoSummaryWidget`。4つのタイルと、7日間のグラフの高さを確保する */
export const VideoSummaryWidgetSkeleton = () => (
  <PanelSkeleton title="動画サマリー">
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTileSkeleton change />
      <StatTileSkeleton change />
      <StatTileSkeleton change />
      <StatTileSkeleton change />
    </div>
    <div className="mt-6">
      <h3 className="mb-3 text-body leading-normal font-semibold">
        動画数推移（7日間）
      </h3>
      <Skeleton className="h-80 w-full rounded-container" />
    </div>
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
