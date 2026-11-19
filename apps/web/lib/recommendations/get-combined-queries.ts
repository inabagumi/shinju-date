import { CACHE_TAGS, REDIS_KEYS } from "@shinju-date/constants";
import { cacheLife, cacheTag } from "next/cache";

import { getRedisClient } from "../redis";

/**
 * Get combined recommendation queries (manual + auto)
 *
 * Manual queries always appear first, followed by auto-recommended queries
 * (by score, descending) that are not already in the manual set.
 *
 * The result is cached with `'use cache: remote'` and tagged with
 * `CACHE_TAGS.RECOMMENDATION_QUERIES`, which admin and batch revalidate
 * after changing the queries.
 */
export const getCombinedRecommendationQueries = async (): Promise<string[]> => {
  "use cache: remote";

  cacheLife("minutes");
  cacheTag(CACHE_TAGS.RECOMMENDATION_QUERIES);

  const redisClient = getRedisClient();
  const [manualQueries, autoQueries] = await Promise.all([
    redisClient.smembers<string[]>(REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED),
    redisClient.zrange<string[]>(REDIS_KEYS.QUERIES_AUTO_RECOMMENDED, 0, -1, {
      rev: true,
    }),
  ]);

  // Combine: manual first, then auto (excluding duplicates)
  const manualSet = new Set(manualQueries);
  const combined = [...manualSet];

  for (const query of autoQueries ?? []) {
    if (!manualSet.has(query)) {
      combined.push(query);
    }
  }

  return combined;
};
