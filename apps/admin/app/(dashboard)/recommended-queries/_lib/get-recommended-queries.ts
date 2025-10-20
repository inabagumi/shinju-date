import { REDIS_KEYS } from '@shinju-date/constants'
import { redisClient } from '@/lib/redis'

export default async function getRecommendedQueries(): Promise<string[]> {
  const queries = await redisClient.smembers<string[]>(
    REDIS_KEYS.RECOMMENDATION_QUERIES,
  )

  return (queries ?? []).sort()
}
