import { TIME_ZONE } from "@shinju-date/constants";
import { readSummarySnapshot } from "@shinju-date/dashboard-stats";
import type { SummaryStats } from "@shinju-date/dashboard-stats";
import { formatDateKey } from "@shinju-date/temporal-fns";
import { cacheLife } from "next/cache";

import { getRedisClient } from "@/lib/redis";

/** The snapshot of the counts of a day. */
export interface HistoricalStatsEntry {
  /** The day of the snapshot (ISO 8601, e.g. `2025-11-12`) */
  day: string;
  /** The counts as of the end of the day, or `null` without the snapshot */
  stats: SummaryStats | null;
}

/**
 * Get the snapshots of the counts of the past N days, saved by the daily job
 * `/stats/snapshot` of batch.
 *
 * The last day is yesterday, whose snapshot is the latest one counted as of
 * the end of a day. The counts of today are not mixed in.
 *
 * The days are read at once, in parallel. `@upstash/redis` sends the reads
 * made in the same tick in one request (auto-pipelining), so reading the 31
 * days of the 30-day chart does not make a request for each day.
 *
 * @param days - Number of days to fetch (default: 7)
 * @returns One entry for each day, ordered from oldest to newest. The days
 * without a snapshot (or with one not in the form of the counts) have `null`.
 */
export const getHistoricalStats = async (
  days = 7
): Promise<HistoricalStatsEntry[]> => {
  "use cache: private";

  cacheLife("minutes");

  const redisClient = getRedisClient();
  const yesterday = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
    .toPlainDate()
    .subtract({ days: 1 });

  return await Promise.all(
    Array.from({ length: days }, async (_, index) => {
      const day = yesterday.subtract({ days: days - 1 - index });
      const stats = await readSummarySnapshot(redisClient, formatDateKey(day));

      return { day: day.toString(), stats };
    })
  );
};
