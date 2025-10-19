'use server'

import { redisClient } from '@/lib/redis'

export type PopularKeyword = {
  keyword: string
  count: number
}

const POPULAR_KEY = 'search:popular'

/**
 * Get the most popular search keywords from Redis
 */
export async function getPopularKeywords(
  limit = 20,
): Promise<PopularKeyword[]> {
  try {
    // Get top keywords with scores
    const results = await redisClient.zrange<string[]>(
      POPULAR_KEY,
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
      keywords.push({
        count: Number.parseInt(results[i + 1], 10),
        keyword: results[i],
      })
    }

    return keywords
  } catch (error) {
    console.error('Failed to fetch popular keywords from Redis:', error)
    return []
  }
}
