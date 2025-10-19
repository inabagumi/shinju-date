'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'

export type AnalyticsSummary = {
  recentSearches: number
  totalPopularKeywords: number
  recentClicks: number
}

/**
 * Get summary analytics data for the dashboard
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  try {
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
    const clickKey = `videos:clicked:${dateKey}`
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

    return {
      recentClicks,
      recentSearches: recentSearches ?? 0,
      totalPopularKeywords: totalPopularKeywords ?? 0,
    }
  } catch (error) {
    console.error('Failed to fetch analytics summary:', error)
    return {
      recentClicks: 0,
      recentSearches: 0,
      totalPopularKeywords: 0,
    }
  }
}
