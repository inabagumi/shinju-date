"use server";

import { REDIS_KEYS, TIME_ZONE } from "@shinju-date/constants";
import { logger } from "@shinju-date/logger";
import { headers } from "next/headers";

import {
  DAILY_TTL_SECONDS,
  dailyKey,
  hincrbyWithTtl,
  saddWithTtl,
} from "./analytics/redis";
import { getRedisClient } from "./redis";

/**
 * Generate a simple session ID based on IP address and User-Agent
 * This creates a stable identifier for the same user session across pages
 */
async function generateSessionId(): Promise<string> {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for") ||
    headersList.get("x-real-ip") ||
    "unknown";
  const userAgent = headersList.get("user-agent") || "unknown";

  // Create a simple hash of IP + User-Agent to identify the session
  const sessionData = `${ip}-${userAgent}`;

  // Simple hash function to create a short session ID
  let hash = 0;
  for (let i = 0; i < sessionData.length; i++) {
    const char = sessionData.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * Track a page visit (session activity)
 */
export async function trackPageVisit(): Promise<void> {
  try {
    const redisClient = getRedisClient();
    const sessionId = await generateSessionId();
    const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE);

    const multi = redisClient.multi();

    // Track unique sessions using a set
    saddWithTtl(
      multi,
      dailyKey(REDIS_KEYS.SESSIONS_TOTAL_PREFIX, now),
      sessionId,
      DAILY_TTL_SECONDS
    );

    await multi.exec();
  } catch (error) {
    // Log error but don't throw - we don't want analytics to break functionality
    logger.error("ページ訪問の追跡に失敗しました", { error });
  }
}

/**
 * Track that a session performed a search
 */
export async function trackSearchSession(query: string): Promise<void> {
  if (!query || query.trim().length === 0) {
    return;
  }

  try {
    const redisClient = getRedisClient();
    const sessionId = await generateSessionId();
    const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE);

    const multi = redisClient.multi();

    // Track unique sessions that performed searches
    saddWithTtl(
      multi,
      dailyKey(REDIS_KEYS.SESSIONS_WITH_SEARCH_PREFIX, now),
      sessionId,
      DAILY_TTL_SECONDS
    );

    // Track total search count per session for repeat search rate
    hincrbyWithTtl(
      multi,
      dailyKey(REDIS_KEYS.SEARCH_SESSIONS_PREFIX, now),
      sessionId,
      1,
      DAILY_TTL_SECONDS
    );

    await multi.exec();
  } catch (error) {
    logger.error("検索セッションの追跡に失敗しました", { error });
  }
}

/**
 * Track that a user exited after searching without clicking any results
 */
export async function trackSearchExitWithoutClick(
  query: string
): Promise<void> {
  if (!query || query.trim().length === 0) {
    return;
  }

  const normalizedQuery = query.trim().toLowerCase();

  try {
    const redisClient = getRedisClient();
    const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE);

    const multi = redisClient.multi();

    // Increment exit count for this query
    hincrbyWithTtl(
      multi,
      dailyKey(REDIS_KEYS.SEARCH_EXIT_WITHOUT_CLICK_PREFIX, now),
      normalizedQuery,
      1,
      DAILY_TTL_SECONDS
    );

    await multi.exec();
  } catch (error) {
    logger.error("検索離脱の追跡に失敗しました", { error });
  }
}
