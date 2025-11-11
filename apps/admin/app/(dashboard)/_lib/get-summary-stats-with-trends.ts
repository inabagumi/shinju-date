'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { getRedisClient } from '@/lib/redis'
import { getSummaryStats, type SummaryStats } from './get-summary-stats'

export type TrendValue = {
  current: number
  dayChange: number | null
  weekChange: number | null
}

export type SummaryStatsWithTrends = {
  totalVideos: TrendValue
  visibleVideos: TrendValue
  hiddenVideos: TrendValue
  deletedVideos: TrendValue
  totalTerms: TrendValue
  totalTalents: TrendValue
}

/**
 * Get summary statistics with trend indicators (day-over-day and week-over-week)
 */
export async function getSummaryStatsWithTrends(): Promise<SummaryStatsWithTrends> {
  const redisClient = getRedisClient()
  const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
  const todayKey = formatDate(now)

  // Get current stats
  const currentStats = await getSummaryStats()

  // Get yesterday's and last week's snapshots
  const yesterday = now.subtract({ days: 1 })
  const lastWeek = now.subtract({ days: 7 })

  const yesterdayKey = formatDate(yesterday)
  const lastWeekKey = formatDate(lastWeek)

  const [yesterdayStats, lastWeekStats] = await Promise.all([
    redisClient.get<SummaryStats>(
      `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${yesterdayKey}`,
    ),
    redisClient.get<SummaryStats>(
      `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${lastWeekKey}`,
    ),
  ])

  // Store today's snapshot for future comparisons (with 30 days TTL)
  await redisClient.set(
    `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${todayKey}`,
    currentStats,
    { ex: 30 * 24 * 60 * 60 }, // 30 days
  )

  // Calculate trends
  const calculateTrend = (
    current: number,
    previous: number | undefined,
  ): number | null => {
    if (previous === undefined) return null
    return current - previous
  }

  return {
    deletedVideos: {
      current: currentStats.deletedVideos,
      dayChange: calculateTrend(
        currentStats.deletedVideos,
        yesterdayStats?.deletedVideos,
      ),
      weekChange: calculateTrend(
        currentStats.deletedVideos,
        lastWeekStats?.deletedVideos,
      ),
    },
    hiddenVideos: {
      current: currentStats.hiddenVideos,
      dayChange: calculateTrend(
        currentStats.hiddenVideos,
        yesterdayStats?.hiddenVideos,
      ),
      weekChange: calculateTrend(
        currentStats.hiddenVideos,
        lastWeekStats?.hiddenVideos,
      ),
    },
    totalTalents: {
      current: currentStats.totalTalents,
      dayChange: calculateTrend(
        currentStats.totalTalents,
        yesterdayStats?.totalTalents,
      ),
      weekChange: calculateTrend(
        currentStats.totalTalents,
        lastWeekStats?.totalTalents,
      ),
    },
    totalTerms: {
      current: currentStats.totalTerms,
      dayChange: calculateTrend(
        currentStats.totalTerms,
        yesterdayStats?.totalTerms,
      ),
      weekChange: calculateTrend(
        currentStats.totalTerms,
        lastWeekStats?.totalTerms,
      ),
    },
    totalVideos: {
      current: currentStats.totalVideos,
      dayChange: calculateTrend(
        currentStats.totalVideos,
        yesterdayStats?.totalVideos,
      ),
      weekChange: calculateTrend(
        currentStats.totalVideos,
        lastWeekStats?.totalVideos,
      ),
    },
    visibleVideos: {
      current: currentStats.visibleVideos,
      dayChange: calculateTrend(
        currentStats.visibleVideos,
        yesterdayStats?.visibleVideos,
      ),
      weekChange: calculateTrend(
        currentStats.visibleVideos,
        lastWeekStats?.visibleVideos,
      ),
    },
  }
}
