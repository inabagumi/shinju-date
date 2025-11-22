import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDateKey } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { getRedisClient } from '@/lib/redis'
import type { SummaryStats } from './get-summary-stats'

export type HistoricalStatsEntry = {
  date: string
  totalVideos: number
  visibleVideos: number
  hiddenVideos: number
  deletedVideos: number
}

/**
 * Get historical summary statistics for the past N days
 * @param days - Number of days to fetch (default: 7)
 * @returns Array of historical stats, ordered from oldest to newest
 */
export async function getHistoricalStats(
  days = 7,
): Promise<HistoricalStatsEntry[]> {
  const redisClient = getRedisClient()
  const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)

  // Generate date keys for the past N days
  const dateKeys: Array<{ date: string; key: string }> = []
  for (let i = days - 1; i >= 0; i--) {
    const targetDate = now.subtract({ days: i })
    const dateKey = formatDateKey(targetDate)
    const redisKey = `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${dateKey}`
    dateKeys.push({ date: dateKey, key: redisKey })
  }

  // Fetch all stats in parallel
  const statsPromises = dateKeys.map(async ({ date, key }) => {
    const stats = await redisClient.get<SummaryStats>(key)
    return {
      date,
      stats,
    }
  })

  const results = await Promise.all(statsPromises)

  // Filter out null results and transform to HistoricalStatsEntry
  const historicalStats: HistoricalStatsEntry[] = []
  for (const { date, stats } of results) {
    if (stats) {
      historicalStats.push({
        date: formatDateForDisplay(date),
        deletedVideos: stats.deletedVideos,
        hiddenVideos: stats.hiddenVideos,
        totalVideos: stats.totalVideos,
        visibleVideos: stats.visibleVideos,
      })
    }
  }

  return historicalStats
}

/**
 * Format date key (YYYYMMDD) to display format (MM/DD)
 */
function formatDateForDisplay(dateKey: string): string {
  const month = Number.parseInt(dateKey.slice(4, 6), 10)
  const day = Number.parseInt(dateKey.slice(6, 8), 10)

  return `${month}/${day}`
}
