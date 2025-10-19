'use server'

import { redisClient } from './redis'

const POPULAR_KEY = 'search:popular'
const ZERO_RESULTS_KEY = 'search:zero_results'
const VOLUME_KEY_PREFIX = 'search:volume:'

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
    // Run all Redis operations in parallel for better performance
    const operations: Promise<unknown>[] = [
      // Increment popular keyword count
      redisClient.zincrby(POPULAR_KEY, 1, normalizedQuery),
    ]

    // Track zero-result searches
    if (resultCount === 0) {
      operations.push(redisClient.sadd(ZERO_RESULTS_KEY, normalizedQuery))
    }

    // Track daily search volume
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    operations.push(redisClient.incr(`${VOLUME_KEY_PREFIX}${today}`))

    await Promise.all(operations)
  } catch (error) {
    // Log error but don't throw - we don't want analytics to break search
    console.error('Failed to log search query to Redis:', error)
  }
}
