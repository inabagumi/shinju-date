import { REDIS_KEYS } from "@shinju-date/constants";
import { cacheLife } from "next/cache";

import { DEFAULT_RANKING_LIMIT, toDateRange } from "./period";
import type { RankingQuery } from "./period";
import { getPopularItems } from "./popular-items";

export interface PopularKeyword {
  keyword: string;
  count: number;
}

/**
 * Get popular keywords for a single date or date range
 * @param query.range - The date range (both ends inclusive). Pass the same date as `start` and `end` for a single date
 * @param query.limit - Maximum number to return (`DEFAULT_RANKING_LIMIT` by default)
 */
export const getPopularKeywords = async ({
  limit = DEFAULT_RANKING_LIMIT,
  range,
}: RankingQuery): Promise<PopularKeyword[]> => {
  "use cache: private";

  cacheLife("minutes");

  const keywordScores = await getPopularItems(
    REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX,
    {
      limit,
      range: toDateRange(range),
    }
  );

  return keywordScores.map(([keyword, count]) => ({
    count: Math.round(count),
    keyword,
  }));
};
