'use server'

import { REDIS_KEYS } from '@shinju-date/constants'
import { redisClient } from '@/lib/redis'

export type PopularKeyword = {
  keyword: string
  count: number
}

/**
 * Get the most popular search keywords from Redis
 */
export async function getPopularKeywords(
  limit = 20,
): Promise<PopularKeyword[]> {
  try {
    // Get top keywords with scores
    const results = await redisClient.zrange<string[]>(
      REDIS_KEYS.SEARCH_POPULAR,
      0,
      limit - 1,
      {
        rev: true,
        withScores: true,
      },
    )

    // Parse results: [keyword1, score1, keyword2, score2, ...]
    const keywords: PopularKeyword[] = []
    for (let i = 0; i < results.length; i += 2) {
      const keyword = results[i]
      const scoreStr = results[i + 1]

      // Type guard to ensure we have valid data
      if (keyword && scoreStr) {
        keywords.push({
          count: Number.parseInt(scoreStr, 10),
          keyword,
        })
      }
    }

    return keywords
  } catch (error) {
    console.error('Failed to fetch popular keywords from Redis:', error)
    return []
  }
}
