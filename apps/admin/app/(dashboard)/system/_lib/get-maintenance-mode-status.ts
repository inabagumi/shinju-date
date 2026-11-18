import { REDIS_KEYS } from "@shinju-date/constants";
import { logger } from "@shinju-date/logger";
import { cacheLife } from "next/cache";

import { getRedisClient } from "@/lib/redis";

/**
 * メンテナンスモードが有効かどうかを返す。読めなかったときは、無効として扱う。
 */
export async function getMaintenanceModeStatus(): Promise<boolean> {
  "use cache: private";

  cacheLife("minutes");

  try {
    const redisClient = getRedisClient();
    const value = await redisClient.get<boolean>(REDIS_KEYS.MAINTENANCE_MODE);
    return value === true;
  } catch (error) {
    logger.error("メンテナンスモードの状態の取得に失敗しました", { error });
    return false;
  }
}
