import { REDIS_KEYS } from "@shinju-date/constants";
import { logger } from "@shinju-date/logger";
import { formatDateKey } from "@shinju-date/temporal-fns";
import { cacheLife } from "next/cache";

import { getRedisClient } from "@/lib/redis";

import { listDatesInRange } from "./list-dates-in-range";
import { toDateRange } from "./period";
import type { PeriodQuery } from "./period";

export interface DailySearchVolume {
  count: number;
  date: string;
}

/**
 * Get daily search volume for a date range
 * @param query.range - The date range (both ends inclusive)
 */
export const getSearchVolume = async ({
  range,
}: PeriodQuery): Promise<DailySearchVolume[]> => {
  "use cache: private";

  cacheLife("minutes");

  try {
    const redisClient = getRedisClient();
    const { end, start } = toDateRange(range);
    const dates = listDatesInRange(start, end);

    if (dates.length === 0) {
      return [];
    }

    // Fetch every day in a single request instead of one round trip per day
    const pipeline = redisClient.pipeline();
    for (const date of dates) {
      pipeline.get<number>(
        `${REDIS_KEYS.SEARCH_VOLUME_PREFIX}${formatDateKey(date)}`
      );
    }
    const counts = await pipeline.exec<(number | null)[]>();

    const volumes = dates.map((date, index): DailySearchVolume => ({
      count: counts[index] ?? 0,
      date: date.toString(),
    }));

    return volumes;
  } catch (error) {
    logger.error("Redisから検索ボリュームの取得に失敗しました", {
      endDate: range.end,
      error,
      startDate: range.start,
    });
    return [];
  }
};
