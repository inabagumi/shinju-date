'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { formatDateKey } from '@shinju-date/temporal-fns'
import { getRedisClient } from '@/lib/redis'
import { dailyKeys, parseScoredMembers } from './redis'

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
export async function getPopularItems(
  keyPrefix: string,
  limit: number,
  startDate: Temporal.PlainDate,
  endDate?: Temporal.PlainDate,
): Promise<[string, number][]> {
  const redisClient = getRedisClient()

  const getTopItems = async (key: string): Promise<[string, number][]> => {
    const results = await redisClient.zrange<unknown[]>(key, 0, limit - 1, {
      rev: true,
      withScores: true,
    })

    return parseScoredMembers(results).map(({ member, score }) => [
      member,
      score,
    ])
  }

  try {
    const start = startDate
    const end = endDate ?? startDate

    // Check if this is a single-day operation
    const isSingleDay = Temporal.PlainDate.compare(start, end) === 0

    if (isSingleDay) {
      // Single day operation - use direct ZRANGE
      return await getTopItems(`${keyPrefix}${formatDateKey(start)}`)
    }

    // Multi-day operation - use ZUNIONSTORE with caching
    const cleanedPrefix = keyPrefix.replace(/:$/, '') // Remove trailing ':'
    const rangeKey = `${formatDateKey(start)}/${formatDateKey(end)}`
    const cacheKey = `${REDIS_KEYS.POPULAR_ITEMS_CACHE_PREFIX}${cleanedPrefix}:${rangeKey}`

    // Try to get cached results first
    const cachedItems = await getTopItems(cacheKey)

    if (cachedItems.length > 0) {
      return cachedItems
    }

    // Build daily keys for the date range
    const keys = dailyKeys(keyPrefix, { end, start })

    if (keys.length > 0) {
      // Create aggregated cache using ZUNIONSTORE
      const pipeline = redisClient.multi()
      pipeline.zunionstore(cacheKey, keys.length, keys)
      pipeline.expire(cacheKey, CACHE_TTL_SECONDS)
      await pipeline.exec()
    }

    // Get aggregated results
    return await getTopItems(cacheKey)
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
}
