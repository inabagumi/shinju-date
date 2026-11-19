import { REDIS_KEYS } from "@shinju-date/constants";
import type { Redis } from "@upstash/redis";
import type { z } from "zod";

import { analyticsSummarySchema, summaryStatsSchema } from "./schema.js";
import type { AnalyticsSummary, SummaryStats } from "./schema.js";

/** How long a snapshot is kept (30 days). */
export const SNAPSHOT_TTL_SECONDS = 30 * 24 * 60 * 60;

const getSummaryKey = (dateKey: string): string =>
  `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${dateKey}`;

const getAnalyticsKey = (dateKey: string): string =>
  `${REDIS_KEYS.SUMMARY_ANALYTICS_PREFIX}${dateKey}`;

const readSnapshot = async <T>(
  redisClient: Redis,
  key: string,
  schema: z.ZodType<T>
): Promise<T | null> => {
  const value = await redisClient.get<unknown>(key);
  const result = schema.safeParse(value);

  return result.success ? result.data : null;
};

/**
 * Read the snapshot of the counts of a day (`dateKey`, made by
 * `formatDateKey`). Returns `null` when there is none, or when it is not in
 * the form of {@link SummaryStats}.
 */
export const readSummarySnapshot = (
  redisClient: Redis,
  dateKey: string
): Promise<SummaryStats | null> =>
  readSnapshot(redisClient, getSummaryKey(dateKey), summaryStatsSchema);

/** Save the snapshot of the counts of a day (`dateKey`). */
export const writeSummarySnapshot = async (
  redisClient: Redis,
  dateKey: string,
  stats: SummaryStats
): Promise<void> => {
  await redisClient.set(getSummaryKey(dateKey), stats, {
    ex: SNAPSHOT_TTL_SECONDS,
  });
};

/**
 * Read the snapshot of the analytics of a day (`dateKey`, made by
 * `formatDateKey`). Returns `null` when there is none, or when it is not in
 * the form of {@link AnalyticsSummary}.
 */
export const readAnalyticsSnapshot = (
  redisClient: Redis,
  dateKey: string
): Promise<AnalyticsSummary | null> =>
  readSnapshot(redisClient, getAnalyticsKey(dateKey), analyticsSummarySchema);

/** Save the snapshot of the analytics of a day (`dateKey`). */
export const writeAnalyticsSnapshot = async (
  redisClient: Redis,
  dateKey: string,
  summary: AnalyticsSummary
): Promise<void> => {
  await redisClient.set(getAnalyticsKey(dateKey), summary, {
    ex: SNAPSHOT_TTL_SECONDS,
  });
};
