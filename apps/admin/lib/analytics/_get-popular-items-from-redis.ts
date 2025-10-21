'use server'

import { TIME_ZONE } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'

/**
 * キャッシュ有効期間（秒）
 */
const CACHE_TTL_SECONDS = 60 * 10 // 10 minutes

/**
 * Generic helper function to get popular items from Redis
 * Automatically handles single-day (ZRANGE) vs multi-day (ZUNIONSTORE) operations
 *
 * @param keyPrefix - Redis key prefix for the item type (e.g., 'videos:click:', 'channels:click:')
 * @param cacheKeyPrefix - Cache key prefix for multi-day aggregations
 * @param limit - Maximum number of items to return
 * @param startDate - Start date in ISO 8601 format (YYYY-MM-DD)
 * @param endDate - End date in ISO 8601 format (YYYY-MM-DD). If undefined or equals startDate, uses single-day operation
 * @returns Array of [itemId, score] tuples
 */
export async function _getPopularItemsFromRedis<T extends string | number>(
  keyPrefix: string,
  cacheKeyPrefix: string,
  limit: number,
  startDate: string,
  endDate?: string,
): Promise<[T, number][]> {
  const itemScores: [T, number][] = []

  try {
    const start = Temporal.PlainDate.from(startDate)
    const end = endDate ? Temporal.PlainDate.from(endDate) : start

    // Check if this is a single-day operation
    const isSingleDay = Temporal.PlainDate.compare(start, end) === 0

    if (isSingleDay) {
      // Single day operation - use direct ZRANGE
      const zonedDate = start.toZonedDateTime({
        plainTime: Temporal.PlainTime.from('00:00:00'),
        timeZone: TIME_ZONE,
      })
      const dailyKey = `${keyPrefix}${formatDate(zonedDate)}`

      const results = await redisClient.zrange<T[]>(dailyKey, 0, limit - 1, {
        rev: true,
        withScores: true,
      })

      // Parse results: [item1, score1, item2, score2, ...]
      for (let i = 0; i < results.length; i += 2) {
        const item = results[i]
        const score = results[i + 1]

        if (item != null && typeof score === 'number') {
          itemScores.push([item, score])
        }
      }
    } else {
      // Multi-day operation - use ZUNIONSTORE with caching
      const startZoned = start.toZonedDateTime({
        plainTime: Temporal.PlainTime.from('00:00:00'),
        timeZone: TIME_ZONE,
      })
      const endZoned = end.toZonedDateTime({
        plainTime: Temporal.PlainTime.from('00:00:00'),
        timeZone: TIME_ZONE,
      })
      const cacheKey = `${cacheKeyPrefix}${formatDate(startZoned)}/${formatDate(endZoned)}`

      // Try to get cached results first
      const cachedResults = await redisClient.zrange<T[]>(
        cacheKey,
        0,
        limit - 1,
        {
          rev: true,
          withScores: true,
        },
      )

      if (cachedResults.length > 0) {
        // Use cached results
        for (let i = 0; i < cachedResults.length; i += 2) {
          const item = cachedResults[i]
          const score = cachedResults[i + 1]

          if (item != null && typeof score === 'number') {
            itemScores.push([item, score])
          }
        }
      } else {
        // Build daily keys for the date range
        const dailyKeys: string[] = []
        let currentDate = start
        while (Temporal.PlainDate.compare(currentDate, end) <= 0) {
          const zonedDate = currentDate.toZonedDateTime({
            plainTime: Temporal.PlainTime.from('00:00:00'),
            timeZone: TIME_ZONE,
          })
          dailyKeys.push(`${keyPrefix}${formatDate(zonedDate)}`)
          currentDate = currentDate.add({ days: 1 })
        }

        if (dailyKeys.length > 0) {
          // Create aggregated cache using ZUNIONSTORE
          const pipeline = redisClient.multi()
          pipeline.zunionstore(cacheKey, dailyKeys.length, dailyKeys)
          pipeline.expire(cacheKey, CACHE_TTL_SECONDS)
          await pipeline.exec()
        }

        // Get aggregated results
        const newResults = await redisClient.zrange<T[]>(
          cacheKey,
          0,
          limit - 1,
          {
            rev: true,
            withScores: true,
          },
        )

        for (let i = 0; i < newResults.length; i += 2) {
          const item = newResults[i]
          const score = newResults[i + 1]

          if (item != null && typeof score === 'number') {
            itemScores.push([item, score])
          }
        }
      }
    }
  } catch (error) {
    logger.error('Redis通信で人気アイテムの取得に失敗しました', {
      cacheKeyPrefix,
      endDate: endDate ?? 'undefined',
      error,
      keyPrefix,
      limit,
      startDate,
    })

    return []
  }

  return itemScores
}
