'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { getRedisClient } from '@/lib/redis'
import {
  type AnalyticsSummary,
  getAnalyticsSummary,
} from './get-analytics-summary'

export type AnalyticsTrendValue = {
  current: number
  dayChange: number | null
  weekChange: number | null
}

export type AnalyticsSummaryWithTrends = {
  recentSearches: AnalyticsTrendValue
  totalPopularKeywords: AnalyticsTrendValue
  recentClicks: AnalyticsTrendValue
}

/**
 * Get analytics summary with trend indicators (day-over-day and week-over-week)
 */
export async function getAnalyticsSummaryWithTrends(): Promise<AnalyticsSummaryWithTrends> {
  const redisClient = getRedisClient()
  const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
  const todayKey = formatDate(now)

  // Get current analytics
  const currentAnalytics = await getAnalyticsSummary()

  // Get yesterday's and last week's snapshots
  const yesterday = now.subtract({ days: 1 })
  const lastWeek = now.subtract({ days: 7 })

  const yesterdayKey = formatDate(yesterday)
  const lastWeekKey = formatDate(lastWeek)

  const [yesterdayAnalytics, lastWeekAnalytics] = await Promise.all([
    redisClient.get<AnalyticsSummary>(
      `${REDIS_KEYS.SUMMARY_ANALYTICS_PREFIX}${yesterdayKey}`,
    ),
    redisClient.get<AnalyticsSummary>(
      `${REDIS_KEYS.SUMMARY_ANALYTICS_PREFIX}${lastWeekKey}`,
    ),
  ])

  // Store today's snapshot for future comparisons (with 30 days TTL)
  await redisClient.set(
    `${REDIS_KEYS.SUMMARY_ANALYTICS_PREFIX}${todayKey}`,
    currentAnalytics,
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
    recentClicks: {
      current: currentAnalytics.recentClicks,
      dayChange: calculateTrend(
        currentAnalytics.recentClicks,
        yesterdayAnalytics?.recentClicks,
      ),
      weekChange: calculateTrend(
        currentAnalytics.recentClicks,
        lastWeekAnalytics?.recentClicks,
      ),
    },
    recentSearches: {
      current: currentAnalytics.recentSearches,
      dayChange: calculateTrend(
        currentAnalytics.recentSearches,
        yesterdayAnalytics?.recentSearches,
      ),
      weekChange: calculateTrend(
        currentAnalytics.recentSearches,
        lastWeekAnalytics?.recentSearches,
      ),
    },
    totalPopularKeywords: {
      current: currentAnalytics.totalPopularKeywords,
      dayChange: calculateTrend(
        currentAnalytics.totalPopularKeywords,
        yesterdayAnalytics?.totalPopularKeywords,
      ),
      weekChange: calculateTrend(
        currentAnalytics.totalPopularKeywords,
        lastWeekAnalytics?.totalPopularKeywords,
      ),
    },
  }
}
