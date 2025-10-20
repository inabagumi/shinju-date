'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { redisClient } from '@/lib/redis'

/**
 * Get keywords that returned zero search results from Redis
 */
export async function getZeroResultKeywords(): Promise<string[]> {
  try {
    const keywords = await redisClient.smembers<string[]>(
      REDIS_KEYS.SEARCH_ZERO_RESULTS,
    )
    return keywords.sort()
  } catch (error) {
    logger.error('Redisからゼロ結果キーワードの取得に失敗しました', error)
    return []
  }
}
