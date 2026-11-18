import { REDIS_KEYS } from "@shinju-date/constants";
import { logger } from "@shinju-date/logger";
import { cacheLife } from "next/cache";

import { getRedisClient } from "@/lib/redis";

import { listDatesInRange } from "./list-dates-in-range";
import { type PeriodQuery, toDateRange } from "./period";
import { dailyKeys, sumScores } from "./redis";

export interface DailyClickVolume {
  clicks: number;
  date: string;
}

/**
 * Get daily click volume for a date range
 * @param query.range - The date range (both ends inclusive)
 */
export async function getClickVolume({
  range,
}: PeriodQuery): Promise<DailyClickVolume[]> {
  "use cache: private";

  cacheLife("minutes");

  try {
    const redisClient = getRedisClient();
    const dateRange = toDateRange(range);
    const dates = listDatesInRange(dateRange.start, dateRange.end);

    if (dates.length === 0) {
      return [];
    }

    // Fetch every day in a single request instead of one round trip per day
    const pipeline = redisClient.pipeline();
    for (const key of dailyKeys(REDIS_KEYS.CLICK_VIDEO_PREFIX, dateRange)) {
      pipeline.zrange(key, 0, -1, {
        rev: false,
        withScores: true,
      });
    }
    const results = await pipeline.exec<unknown[][]>();

    const volumes = dates.map((date, index): DailyClickVolume => {
      return {
        // The sum of all video clicks for this day
        clicks: sumScores(results[index]),
        date: date.toString(),
      };
    });

    return volumes;
  } catch (error) {
    logger.error("Redisからクリックボリュームの取得に失敗しました", {
      endDate: range.end,
      error,
      startDate: range.start,
    });
    return [];
  }
}
