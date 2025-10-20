import { REDIS_KEYS } from '@shinju-date/constants'
import { redisClient } from '../redis'

const CACHE_TTL = 600 // 10 minutes

/**
 * Get combined recommendation queries (manual + auto)
 * Manual queries always appear first, followed by auto-recommended queries
 * Results are cached in Redis to avoid recalculation on every page load
 */
export async function getCombinedRecommendationQueries(): Promise<string[]> {
  // Try to get cached result first
  const cached = await redisClient.get<string[]>(
    REDIS_KEYS.QUERIES_COMBINED_CACHE,
  )

  if (cached && Array.isArray(cached)) {
    return cached
  }

  // Get manual and auto recommendations
  const [manualQueries, autoQueriesWithScores] = await Promise.all([
    redisClient.smembers<string[]>(REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED),
    redisClient.zrange(REDIS_KEYS.QUERIES_AUTO_RECOMMENDED, 0, -1, {
      rev: true,
    }),
  ])

  // Extract just the query strings from auto recommendations
  const autoQueries = (autoQueriesWithScores ?? []) as string[]

  // Combine: manual first, then auto (excluding duplicates)
  const manualSet = new Set(manualQueries ?? [])
  const combined = [...manualSet]

  for (const query of autoQueries) {
    if (!manualSet.has(query)) {
      combined.push(query)
    }
  }

  // Cache the result
  if (combined.length > 0) {
    await redisClient.setex(
      REDIS_KEYS.QUERIES_COMBINED_CACHE,
      CACHE_TTL,
      combined,
    )
  }

  return combined
}
