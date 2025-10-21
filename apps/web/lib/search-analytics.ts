'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { formatDate, getMondayOfWeek } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { timeZone } from './constants'
import { redisClient } from './redis'

// TTL settings for time-based search keys
const DAILY_TTL_SECONDS = 90 * 24 * 60 * 60 // 90 days

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

    const multi = redisClient.multi()

    // Increment daily search count
    multi.zincrby(
      `${REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX}${today}`,
      1,
      normalizedQuery,
    )

    // Increment weekly search count
    multi.zincrby(
      `${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}${mondayOfWeek}`,
      1,
      normalizedQuery,
    )

    // Increment all-time search count
    multi.zincrby(REDIS_KEYS.SEARCH_POPULAR_ALL_TIME, 1, normalizedQuery)

    // Track zero-result searches
    if (resultCount === 0) {
      multi.sadd(REDIS_KEYS.SEARCH_ZERO_RESULTS, normalizedQuery)
    }

    // Track daily search volume
    multi.incr(`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}${today}`)

    // Set TTL for daily keys in the same pipeline
    multi.expire(
      `${REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX}${today}`,
      DAILY_TTL_SECONDS,
    )

    await multi.exec()
  } catch (error) {
    // Log error but don't throw - we don't want analytics to break search
    logger.error('Redisへの検索クエリのログ記録に失敗しました', error)
  }
}
