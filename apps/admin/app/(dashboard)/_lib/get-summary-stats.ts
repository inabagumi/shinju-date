import { TIME_ZONE } from "@shinju-date/constants";
import {
  countSummaryStats,
  readSummarySnapshot,
  type SummaryStats,
  type WithTrends,
  withTrends,
} from "@shinju-date/dashboard-stats";
import { formatDateKey } from "@shinju-date/temporal-fns";
import { cacheLife } from "next/cache";

import { getRedisClient } from "@/lib/redis";
import { createSupabaseServerClient } from "@/lib/supabase";

/**
 * Get the counts of the videos, terms and talents, each with its changes from
 * the snapshots of the day before and the week before (saved by the daily
 * job `/stats/snapshot` of batch).
 *
 * The widgets of the dashboard share one result, so that the counts run once
 * for each display.
 */
export async function getSummaryStats(): Promise<WithTrends<SummaryStats>> {
  "use cache: private";

  cacheLife("minutes");

  const supabaseClient = await createSupabaseServerClient();
  const redisClient = getRedisClient();
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE);

  const [current, yesterday, lastWeek] = await Promise.all([
    countSummaryStats(supabaseClient),
    readSummarySnapshot(
      redisClient,
      formatDateKey(today.subtract({ days: 1 }))
    ),
    readSummarySnapshot(
      redisClient,
      formatDateKey(today.subtract({ days: 7 }))
    ),
  ]);

  return withTrends(current, yesterday, lastWeek);
}
