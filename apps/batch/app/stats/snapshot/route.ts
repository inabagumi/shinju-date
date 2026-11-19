import { TIME_ZONE } from "@shinju-date/constants";
import {
  collectAnalyticsSummary,
  countSummaryStats,
  writeAnalyticsSnapshot,
  writeSummarySnapshot,
} from "@shinju-date/dashboard-stats";
import { logger } from "@shinju-date/logger";
import { formatDateKey } from "@shinju-date/temporal-fns";

import { runCronJob } from "@/lib/cron";
import { STATS_SNAPSHOT_JOB } from "@/lib/jobs";
import { redisClient } from "@/lib/redis";
import { supabaseClient } from "@/lib/supabase";

export const maxDuration = 60;

export const POST = async (request: Request): Promise<Response> =>
  await runCronJob(request, STATS_SNAPSHOT_JOB, async () => {
    // The target is the previous day in Japan, counted as of its end (the
    // start of today).
    const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE);
    const previousDay = now.subtract({ days: 1 });
    const asOf = now.startOfDay().toInstant();
    const dateKey = formatDateKey(previousDay);

    const [summaryStats, analyticsSummary] = await Promise.all([
      countSummaryStats(supabaseClient, { asOf }),
      collectAnalyticsSummary(redisClient, dateKey),
    ]);

    await Promise.all([
      writeSummarySnapshot(redisClient, dateKey, summaryStats),
      writeAnalyticsSnapshot(redisClient, dateKey, analyticsSummary),
    ]);

    logger.info("統計のスナップショットを保存しました", {
      analyticsSummary,
      date: dateKey,
      summaryStats,
    });
  });

export const GET = POST;
