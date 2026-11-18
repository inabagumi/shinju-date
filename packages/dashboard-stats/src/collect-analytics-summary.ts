import { REDIS_KEYS } from "@shinju-date/constants";
import type { Redis } from "@upstash/redis";

import type { AnalyticsSummary } from "./schema.js";

/**
 * Sum the scores of a sorted set read with `withScores`, which alternates
 * members and scores. Scores that are not numbers are skipped.
 */
function sumScores(membersWithScores: readonly unknown[]): number {
  let total = 0;

  for (let index = 1; index < membersWithScores.length; index += 2) {
    const score = Number(membersWithScores[index]);

    if (Number.isFinite(score)) {
      total += score;
    }
  }

  return total;
}

/**
 * Collect the searches and clicks of a day (`dateKey`, made by
 * `formatDateKey`) and the number of the popular keywords of all time.
 */
export async function collectAnalyticsSummary(
  redisClient: Redis,
  dateKey: string
): Promise<AnalyticsSummary> {
  const [recentSearches, totalPopularKeywords, clickResults] =
    await Promise.all([
      redisClient.get<number>(`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}${dateKey}`),
      // The all-time ranking written by the search analytics of web
      redisClient.zcard(REDIS_KEYS.SEARCH_POPULAR_ALL_TIME),
      redisClient.zrange<unknown[]>(
        `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${dateKey}`,
        0,
        -1,
        {
          rev: false,
          withScores: true,
        }
      ),
    ]);

  return {
    recentClicks: sumScores(clickResults),
    recentSearches: recentSearches ?? 0,
    totalPopularKeywords: totalPopularKeywords ?? 0,
  };
}
