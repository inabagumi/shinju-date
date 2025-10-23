'use server'

import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'

export type PopularKeywordForRange = {
  keyword: string
  count: number
}

/**
 * Get the most popular search keywords from Redis for a date range (aggregated data)
 * Uses ZUNIONSTORE to combine multiple daily keys into a temporary set for aggregation
 */
export async function getPopularKeywordsForRange(
  startDate: string,
  endDate: string,
  limit = 20,
): Promise<PopularKeywordForRange[]> {
  try {
    const start = Temporal.PlainDate.from(startDate)
    const end = Temporal.PlainDate.from(endDate)

    // Generate all daily keys for the date range
    const dailyKeys: string[] = []
    let currentDate = start

    while (Temporal.PlainDate.compare(currentDate, end) <= 0) {
      const zonedDate = currentDate.toZonedDateTime({
        plainTime: Temporal.PlainTime.from('00:00:00'),
        timeZone: TIME_ZONE,
      })
      const dateKey = formatDate(zonedDate)
      const dailyKey = `${REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX}${dateKey}`
      dailyKeys.push(dailyKey)
      currentDate = currentDate.add({ days: 1 })
    }

    // Skip aggregation if no keys (shouldn't happen but defensive)
    if (dailyKeys.length === 0) {
      return []
    }

    // Use a temporary key for the union result
    const tempUnionKey = `${REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION}:${Date.now()}`

    try {
      // Use Redis pipeline for better performance
      const pipeline = redisClient.multi()
      pipeline.zunionstore(tempUnionKey, dailyKeys.length, dailyKeys)
      pipeline.expire(tempUnionKey, 300) // 5 minutes TTL
      await pipeline.exec()

      // Get top keywords with scores from the aggregated result
      const results = await redisClient.zrange<string[]>(
        tempUnionKey,
        0,
        limit - 1,
        {
          rev: true,
          withScores: true,
        },
      )

      // Parse results: [keyword1, score1, keyword2, score2, ...]
      const keywords: PopularKeywordForRange[] = []
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
    } finally {
      // Clean up the temporary key
      await redisClient.del(tempUnionKey).catch((error) => {
        logger.warn('一時的なRedisキーの削除に失敗しました', {
          error,
          tempUnionKey,
        })
      })
    }
  } catch (error) {
    logger.error('期間指定での人気キーワード取得に失敗しました', {
      endDate,
      error,
      limit,
      startDate,
    })
    return []
  }
}
