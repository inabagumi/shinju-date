'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { getRedisClient } from '@/lib/redis'

export type PopularKeyword = {
  keyword: string
  count: number
}

/**
 * Get the most popular search keywords from Redis for a specific date (daily data)
 */
export async function getPopularKeywords(
  date: string,
  limit = 20,
): Promise<PopularKeyword[]> {
  try {
    const plainDate = Temporal.PlainDate.from(date)
    const zonedDate = plainDate.toZonedDateTime({
      plainTime: Temporal.PlainTime.from('00:00:00'),
      timeZone: TIME_ZONE,
    })
    const dateKey = formatDate(zonedDate)
    const dailyKey = `${REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX}${dateKey}`

    const redisClient = getRedisClient()

    // Get top keywords with scores from the specified date
    const results = await redisClient.zrange<string[]>(dailyKey, 0, limit - 1, {
      rev: true,
      withScores: true,
    })

    // Parse results: [keyword1, score1, keyword2, score2, ...]
    const keywords: PopularKeyword[] = []
    for (let i = 0; i < results.length; i += 2) {
      const keyword = results[i]
      const scoreStr = results[i + 1]

      // Type guard to ensure we have valid data
      if (keyword && scoreStr) {
        keywords.push({
          count: Number.parseInt(scoreStr, 10),
          keyword,
        })
      }
    }

    return keywords
  } catch (error) {
    logger.error('Redisから人気キーワードの取得に失敗しました', {
      date,
      error,
      limit,
    })
    return []
  }
}
