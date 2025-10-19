import { redisClient } from '@/lib/redis'

const RECOMMENDATION_QUERIES_KEY = 'recommendation_queries'

export default async function getRecommendedQueries(): Promise<string[]> {
  const queries = await redisClient.smembers<string[]>(
    RECOMMENDATION_QUERIES_KEY,
  )

  return (queries ?? []).sort()
}
