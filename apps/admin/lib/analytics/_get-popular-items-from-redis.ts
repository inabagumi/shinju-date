'use server'

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
 * @param limit - Maximum number of items to return
 * @param startDate - Start date as Temporal.PlainDate
 * @param endDate - End date as Temporal.PlainDate. If undefined or equals startDate, uses single-day operation
 * @returns Array of [itemId, score] tuples
 */
export async function _getPopularItemsFromRedis<T extends string | number>(
  keyPrefix: string,
  limit: number,
  startDate: Temporal.PlainDate,
  endDate?: Temporal.PlainDate,
): Promise<[T, number][]> {
  const itemScores: [T, number][] = []

  try {
    const start = startDate
    const end = endDate ?? startDate

    // Check if this is a single-day operation
    const isSingleDay = Temporal.PlainDate.compare(start, end) === 0

    if (isSingleDay) {
      // Single day operation - use direct ZRANGE
      const dailyKey = `${keyPrefix}${formatDate(start)}`

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
      const cleanedPrefix = keyPrefix.replace(/:$/, '') // Remove trailing ':'
      const rangeKey = `${formatDate(start)}/${formatDate(end)}`
      const cacheKey = `cache:popular_items:${cleanedPrefix}:${rangeKey}`

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
          dailyKeys.push(`${keyPrefix}${formatDate(currentDate)}`)
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
      endDate: endDate?.toString() ?? 'undefined',
      error,
      keyPrefix,
      limit,
      startDate: startDate.toString(),
    })

    return []
  }

  return itemScores
}
