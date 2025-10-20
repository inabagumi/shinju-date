'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { timeZone } from './constants'
import { redisClient } from './redis'

// TTL settings for time-based search keys
const DAILY_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days
const WEEKLY_TTL_SECONDS = 35 * 24 * 60 * 60 // 35 days

/**
 * Get the Monday of the week for a given date
 */
function getMondayOfWeek(dateTime: Temporal.ZonedDateTime): string {
  const dayOfWeek = dateTime.dayOfWeek // 1 = Monday, 7 = Sunday
  const daysToSubtract = dayOfWeek - 1
  const monday = dateTime.subtract({ days: daysToSubtract })
  return formatDate(monday)
}

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
      // Increment popular keyword count (legacy)
      redisClient.zincrby(REDIS_KEYS.SEARCH_POPULAR, 1, normalizedQuery),

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
      // Daily key: 7 days TTL
      redisClient.expire(
        `${REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX}${today}`,
        DAILY_TTL_SECONDS,
      ),
      // Weekly key: 35 days TTL
      redisClient.expire(
        `${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}${mondayOfWeek}`,
        WEEKLY_TTL_SECONDS,
      ),
    ]

    await Promise.all(ttlOperations)
  } catch (error) {
    // Log error but don't throw - we don't want analytics to break search
    console.error('Failed to log search query to Redis:', error)
  }
}
