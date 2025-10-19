'use server'

import { redisClient } from '@/lib/redis'

const ZERO_RESULTS_KEY = 'search:zero_results'

/**
 * Get keywords that returned zero search results from Redis
 */
export async function getZeroResultKeywords(): Promise<string[]> {
  try {
    const keywords = await redisClient.smembers<string[]>(ZERO_RESULTS_KEY)
    return keywords.sort()
  } catch (error) {
    console.error('Failed to fetch zero-result keywords from Redis:', error)
    return []
  }
}
