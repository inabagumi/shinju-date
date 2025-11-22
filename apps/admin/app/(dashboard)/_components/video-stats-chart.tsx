import { cacheLife } from 'next/cache'
import { getHistoricalStats } from '../_lib/get-historical-stats'
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
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-semibold text-xl">動画数推移（7日間）</h2>
      {historicalStats.length === 0 ? (
        <div className="flex h-80 items-center justify-center text-gray-500">
          <p>データがありません</p>
        </div>
      ) : (
        <VideoStatsChartUI data={historicalStats} />
      )}
    </div>
  )
}
