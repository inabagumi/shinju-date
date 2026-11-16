import { cacheLife } from 'next/cache'
import { Panel } from '@/components/panel'
import { getHistoricalStats } from '../_lib/get-historical-stats'
import { VideoStatsChartEmpty } from './video-stats-chart-empty'
import { VideoStatsChartUI } from './video-stats-chart-ui'

/**
 * VideoStatsChart - Displays a bar chart of video statistics over the past 7 days
 * This is an async Server Component that fetches its own data
 */
export async function VideoStatsChart() {
  'use cache: private'

  cacheLife('minutes')

  const historicalStats = await getHistoricalStats(7)

  return (
    <Panel title="動画数推移（7日間）">
      {historicalStats.length === 0 ? (
        <VideoStatsChartEmpty />
      ) : (
        <VideoStatsChartUI data={historicalStats} />
      )}
    </Panel>
  )
}
