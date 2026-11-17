import { Panel } from '@/components/panel'
import { getHistoricalStats } from '../_lib/get-historical-stats'
import { getSummaryStats } from '../_lib/get-summary-stats'
import {
  getVideoListHref,
  VIDEO_SUMMARY_FILTERS,
} from '../_lib/video-summary-filters'
import { StatTileLink } from './trend-indicator'
import { VideoStatsChartEmpty } from './video-stats-chart-empty'
import { VideoStatsChartUI } from './video-stats-chart-ui'

/**
 * VideoSummaryWidget - Displays video statistics with 7-day chart
 * This is an async Server Component that fetches its own data
 */
export async function VideoSummaryWidget() {
  const [stats, historicalStats] = await Promise.all([
    getSummaryStats(),
    getHistoricalStats(7),
  ])

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
  )
}

/**
 * ContentSummaryWidget - Displays content statistics (terms and talents)
 * This is an async Server Component that fetches its own data
 */
export async function ContentSummaryWidget() {
  const stats = await getSummaryStats()

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
  )
}
