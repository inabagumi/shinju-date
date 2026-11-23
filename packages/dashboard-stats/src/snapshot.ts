import { REDIS_KEYS } from "@shinju-date/constants";
import type { Redis } from "@upstash/redis";
import type { z } from "zod";

import { analyticsSummarySchema, summaryStatsSchema } from "./schema.js";
import type { AnalyticsSummary, SummaryStats } from "./schema.js";

/**
 * How long a snapshot of the counts is kept (45 days).
 *
 * The daily changes of the past 30 days need the snapshots of 31 days in a
 * row: the 30 days and the day before them. The oldest of them is written at
 * the start of the day after it (about 0:10 in Japan) and read until the end
 * of the 31st day after it, so it has to be kept for 31 days at least. The
 * rest is the margin for a job run late or run again.
 */
export const SUMMARY_SNAPSHOT_TTL_SECONDS = 45 * 24 * 60 * 60;

/**
 * How long a snapshot of the analytics is kept (30 days). The dashboard
 * compares the analytics only with the day before and the week before, so
 * they are not kept as long as the counts.
 */
export const ANALYTICS_SNAPSHOT_TTL_SECONDS = 30 * 24 * 60 * 60;

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

/**
 * Save the snapshot of the counts of a day (`dateKey`), kept for
 * {@link SUMMARY_SNAPSHOT_TTL_SECONDS}. The TTL is set on each write, so the
 * snapshots that have already expired do not come back.
 */
export const writeSummarySnapshot = async (
  redisClient: Redis,
  dateKey: string,
  stats: SummaryStats
): Promise<void> => {
  await redisClient.set(getSummaryKey(dateKey), stats, {
    ex: SUMMARY_SNAPSHOT_TTL_SECONDS,
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

/**
 * Save the snapshot of the analytics of a day (`dateKey`), kept for
 * {@link ANALYTICS_SNAPSHOT_TTL_SECONDS}.
 */
export const writeAnalyticsSnapshot = async (
  redisClient: Redis,
  dateKey: string,
  summary: AnalyticsSummary
): Promise<void> => {
  await redisClient.set(getAnalyticsKey(dateKey), summary, {
    ex: ANALYTICS_SNAPSHOT_TTL_SECONDS,
  });
};
