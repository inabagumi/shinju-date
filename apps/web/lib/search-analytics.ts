"use server";

import { REDIS_KEYS, TIME_ZONE } from "@shinju-date/constants";
import { logger } from "@shinju-date/logger";

import {
  DAILY_TTL_SECONDS,
  dailyKey,
  incrWithTtl,
  WEEKLY_TTL_SECONDS,
  weeklyKey,
  zincrbyWithTtl,
} from "./analytics/redis";
import { getRedisClient } from "./redis";
import { trackSearchSession } from "./session-analytics";

/**
 * Log a search query to Redis for analytics
 */
export async function logSearchQuery(
  query: string,
  resultCount: number
): Promise<void> {
  if (!query || query.trim().length === 0) {
    return;
  }

  const normalizedQuery = query.trim().toLowerCase();

  try {
    const redisClient = getRedisClient();
    const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE);

    const multi = redisClient.multi();

    // Increment daily search count
    zincrbyWithTtl(
      multi,
      dailyKey(REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX, now),
      1,
      normalizedQuery,
      DAILY_TTL_SECONDS
    );

    // Increment weekly search count
    zincrbyWithTtl(
      multi,
      weeklyKey(REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX, now),
      1,
      normalizedQuery,
      WEEKLY_TTL_SECONDS
    );

    // Increment all-time search count. No TTL: the key holds the counts of
    // the whole period, and an expiry would reset them.
    multi.zincrby(REDIS_KEYS.SEARCH_POPULAR_ALL_TIME, 1, normalizedQuery);

    // Track zero-result searches
    if (resultCount === 0) {
      // No TTL: the set collects the keywords of the whole period, which
      // admin lists as they are, and an expiry would empty it.
      multi.sadd(REDIS_KEYS.SEARCH_ZERO_RESULTS, normalizedQuery);
    }

    // Track daily search volume
    incrWithTtl(
      multi,
      dailyKey(REDIS_KEYS.SEARCH_VOLUME_PREFIX, now),
      DAILY_TTL_SECONDS
    );

    await multi.exec();

    // Track session-based analytics
    await trackSearchSession(query);
  } catch (error) {
    // Log error but don't throw - we don't want analytics to break search
    logger.error("Redisへの検索クエリのログ記録に失敗しました", { error });
  }
}
