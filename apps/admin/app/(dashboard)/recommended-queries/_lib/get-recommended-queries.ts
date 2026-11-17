import { REDIS_KEYS } from '@shinju-date/constants'
import { cacheLife } from 'next/cache'
import { getRedisClient } from '@/lib/redis'

export interface AutoRecommendedQuery {
  query: string
  score: number
}

export interface RecommendedQueriesResult {
  manual: string[]
  auto: AutoRecommendedQuery[]
}

export default async function getRecommendedQueries(): Promise<RecommendedQueriesResult> {
  'use cache: private'

  cacheLife('minutes')

  const redisClient = getRedisClient()
  const [manualQueries, autoQueriesWithScores] = await Promise.all([
    redisClient.smembers<string[]>(REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED),
    redisClient.zrange(REDIS_KEYS.QUERIES_AUTO_RECOMMENDED, 0, -1, {
      rev: true,
      withScores: true,
    }),
  ])

  // Parse auto queries with scores
  const autoQueries: AutoRecommendedQuery[] = []
  if (autoQueriesWithScores) {
    for (let i = 0; i < autoQueriesWithScores.length; i += 2) {
      const query = String(autoQueriesWithScores[i])
      const score = Number(autoQueriesWithScores[i + 1])
      autoQueries.push({ query, score })
    }
  }

  return {
    auto: autoQueries,
    manual: (manualQueries ?? []).sort(),
  }
}
