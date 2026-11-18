import { REDIS_KEYS } from "@shinju-date/constants";
import { logger } from "@shinju-date/logger";
import { cacheLife } from "next/cache";

import { getRedisClient } from "@/lib/redis";

/**
 * Get keywords that returned zero search results from Redis
 */
export const getZeroResultKeywords = async (): Promise<string[]> => {
  "use cache: private";

  cacheLife("minutes");

  try {
    const redisClient = getRedisClient();
    const keywords = await redisClient.smembers<string[]>(
      REDIS_KEYS.SEARCH_ZERO_RESULTS
    );
    return keywords.toSorted();
  } catch (error) {
    logger.error("Redisからゼロ結果キーワードの取得に失敗しました", { error });
    return [];
  }
};
