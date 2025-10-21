'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { formatDate, getMondayOfWeek } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { timeZone } from './constants'
import { redisClient } from './redis'

// TTL settings for time-based search keys
const DAILY_TTL_SECONDS = 90 * 24 * 60 * 60 // 90 days
const WEEKLY_TTL_SECONDS = 90 * 24 * 60 * 60 // 90 days

/**
 * Log a search query to Redis for analytics
 */
export async function logSearchQuery(
  query: string,
  resultCount: number,
): Promise<void> {
  if (!query || query.trim().length === 0) {
    return
  }

  const normalizedQuery = query.trim().toLowerCase()

  try {
    const now = Temporal.Now.zonedDateTimeISO(timeZone)
    const today = formatDate(now)
    const mondayOfWeek = getMondayOfWeek(now)

    // Run all Redis operations in parallel for better performance
    const operations: Promise<unknown>[] = [
      // Increment daily search count
      redisClient.zincrby(
        `${REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX}${today}`,
        1,
        normalizedQuery,
      ),

      // Increment weekly search count
      redisClient.zincrby(
        `${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}${mondayOfWeek}`,
        1,
        normalizedQuery,
      ),

      // Increment all-time search count
      redisClient.zincrby(
        REDIS_KEYS.SEARCH_POPULAR_ALL_TIME,
        1,
        normalizedQuery,
      ),
    ]

    // Track zero-result searches
    if (resultCount === 0) {
      operations.push(
        redisClient.sadd(REDIS_KEYS.SEARCH_ZERO_RESULTS, normalizedQuery),
      )
    }

    // Track daily search volume
    operations.push(
      redisClient.incr(`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}${today}`),
    )

    await Promise.all(operations)

    // Set TTL for daily and weekly keys after incrementing
    // We do this separately to avoid blocking the main operations
    const ttlOperations: Promise<unknown>[] = [
      // Daily key: 90 days TTL
      redisClient.expire(
        `${REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX}${today}`,
        DAILY_TTL_SECONDS,
      ),
      // Weekly key: 90 days TTL
      redisClient.expire(
        `${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}${mondayOfWeek}`,
        WEEKLY_TTL_SECONDS,
      ),
    ]

    await Promise.all(ttlOperations)
  } catch (error) {
    // Log error but don't throw - we don't want analytics to break search
    logger.error('Redisへの検索クエリのログ記録に失敗しました', error)
  }
}
