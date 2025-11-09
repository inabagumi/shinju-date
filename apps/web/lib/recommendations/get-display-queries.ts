import { cacheLife, cacheTag } from 'next/cache'
import { getCombinedRecommendationQueries } from './get-combined-queries'

const CHAMPION_COUNT = 2 // Top 1-2 queries always shown
const RANDOM_POOL_START = 2 // Start index for random pool (0-based, so 3rd position)
const RANDOM_POOL_END = 20 // End index for random pool (up to 20th position)

export const TOTAL_DISPLAY_COUNT = 4 // Total queries to display

/**
 * Get recommendation queries for display with diversity
 *
 * Combines "champion" queries (top 1-2 by score) with randomly selected
 * queries from a pool of semi-popular queries (ranks 3-20).
 *
 * This approach ensures:
 * - Important queries always get exposure
 * - Users see variety on each page load
 * - Semi-popular queries get occasional visibility
 *
 * @returns Array of query strings to display (max 4)
 */
export async function getDisplayRecommendationQueries(): Promise<string[]> {
  'use cache: remote'
  cacheLife('minutes')
  cacheTag('recommendation-queries')

  const allQueries = await getCombinedRecommendationQueries()

  if (allQueries.length === 0) {
    return []
  }

  // If we have 4 or fewer queries, just return them all
  if (allQueries.length <= TOTAL_DISPLAY_COUNT) {
    return allQueries
  }

  // Get champion queries (top 1-2)
  const championQueries = allQueries.slice(0, CHAMPION_COUNT)

  // Get random pool (queries from rank 3 to 20)
  const randomPoolEnd = Math.min(RANDOM_POOL_END, allQueries.length)
  const randomPool = allQueries.slice(RANDOM_POOL_START, randomPoolEnd)

  // Calculate how many random queries we need
  const randomCount = TOTAL_DISPLAY_COUNT - championQueries.length

  // If random pool is empty or we don't need any random queries
  if (randomPool.length === 0 || randomCount <= 0) {
    return allQueries.slice(0, TOTAL_DISPLAY_COUNT)
  }

  // Shuffle random pool and take the needed number
  const shuffledPool = [...randomPool].sort(() => Math.random() - 0.5)
  const randomQueries = shuffledPool.slice(0, randomCount)

  // Combine champion and random queries
  return [...championQueries, ...randomQueries]
}
