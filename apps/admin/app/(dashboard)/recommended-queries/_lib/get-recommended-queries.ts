import { REDIS_KEYS } from '@shinju-date/constants'
import { getRedisClient } from '@/lib/redis'

export type RecommendedQueriesResult = {
  manual: string[]
  auto: Array<{ query: string; score: number }>
}

export default async function getRecommendedQueries(): Promise<RecommendedQueriesResult> {
  const redisClient = getRedisClient()
  const [manualQueries, autoQueriesWithScores] = await Promise.all([
    redisClient.smembers<string[]>(REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED),
    redisClient.zrange(REDIS_KEYS.QUERIES_AUTO_RECOMMENDED, 0, -1, {
      rev: true,
      withScores: true,
    }),
  ])

  // Parse auto queries with scores
  const autoQueries: Array<{ query: string; score: number }> = []
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
