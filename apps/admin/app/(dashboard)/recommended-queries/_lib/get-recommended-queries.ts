import { REDIS_KEYS } from "@shinju-date/constants";
import { cacheLife } from "next/cache";

import { parseScoredMembers } from "@/lib/analytics/redis";
import { getRedisClient } from "@/lib/redis";

export interface AutoRecommendedQuery {
  query: string;
  score: number;
}

export interface RecommendedQueriesResult {
  manual: string[];
  auto: AutoRecommendedQuery[];
}

export default async function getRecommendedQueries(): Promise<RecommendedQueriesResult> {
  "use cache: private";

  cacheLife("minutes");

  const redisClient = getRedisClient();
  const [manualQueries, autoQueriesWithScores] = await Promise.all([
    redisClient.smembers<string[]>(REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED),
    redisClient.zrange<unknown[]>(REDIS_KEYS.QUERIES_AUTO_RECOMMENDED, 0, -1, {
      rev: true,
      withScores: true,
    }),
  ]);

  return {
    auto: parseScoredMembers(autoQueriesWithScores).map(
      ({ member, score }): AutoRecommendedQuery => ({ query: member, score })
    ),
    manual: (manualQueries ?? []).sort(),
  };
}
