'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { getRedisClient } from '@/lib/redis'

export type AnalyticsSummary = {
  recentSearches: number
  totalPopularKeywords: number
  recentClicks: number
}

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
 * Get summary analytics data for the dashboard
 * @param includeTrends - If true, returns data with trend indicators (day-over-day and week-over-week)
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary>
export async function getAnalyticsSummary(
  includeTrends: true,
): Promise<AnalyticsSummaryWithTrends>
export async function getAnalyticsSummary(
  includeTrends?: boolean,
): Promise<AnalyticsSummary | AnalyticsSummaryWithTrends> {
  try {
    const redisClient = getRedisClient()
    const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
    const dateKey = formatDate(today)

    // Get today's search volume
    const recentSearches = await redisClient.get<number>(
      `${REDIS_KEYS.SEARCH_VOLUME_PREFIX}${dateKey}`,
    )

    // Get count of unique popular keywords
    const totalPopularKeywords = await redisClient.zcard(
      REDIS_KEYS.SEARCH_POPULAR,
    )

    // Get today's click volume
    const clickKey = `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${dateKey}`
    const clickResults = await redisClient.zrange<string[]>(clickKey, 0, -1, {
      rev: false,
      withScores: true,
    })

    let recentClicks = 0
    for (let j = 1; j < clickResults.length; j += 2) {
      const scoreStr = clickResults[j]
      if (scoreStr) {
        recentClicks += Number.parseInt(scoreStr, 10)
      }
    }

    const currentAnalytics: AnalyticsSummary = {
      recentClicks,
      recentSearches: recentSearches ?? 0,
      totalPopularKeywords: totalPopularKeywords ?? 0,
    }

    // If trends not requested, return current data only
    if (!includeTrends) {
      return currentAnalytics
    }

    // Get yesterday's and last week's snapshots for trends
    const yesterday = today.subtract({ days: 1 })
    const lastWeek = today.subtract({ days: 7 })

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
      `${REDIS_KEYS.SUMMARY_ANALYTICS_PREFIX}${dateKey}`,
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
  } catch (error) {
    logger.error('分析サマリーの取得に失敗しました', { error })

    const fallbackData: AnalyticsSummary = {
      recentClicks: 0,
      recentSearches: 0,
      totalPopularKeywords: 0,
    }

    if (!includeTrends) {
      return fallbackData
    }

    // Return with null trends on error
    return {
      recentClicks: {
        current: 0,
        dayChange: null,
        weekChange: null,
      },
      recentSearches: {
        current: 0,
        dayChange: null,
        weekChange: null,
      },
      totalPopularKeywords: {
        current: 0,
        dayChange: null,
        weekChange: null,
      },
    }
  }
}
