import { REDIS_KEYS } from "@shinju-date/constants";
import { logger } from "@shinju-date/logger";
import { cacheLife } from "next/cache";

import { getRedisClient } from "@/lib/redis";

/**
 * 最後に動画を同期した時刻を、ISO 8601 の文字列（UTC）で返す。
 *
 * キャッシュの戻り値は直列化できる値に限られるため、`Temporal` のオブジェクト
 * ではなく文字列にする
 */
export async function getLastVideoSync(): Promise<string | null> {
  "use cache: private";

  cacheLife("minutes");

  try {
    const redisClient = getRedisClient();
    const timestamp = await redisClient.get<string>(REDIS_KEYS.LAST_VIDEO_SYNC);
    if (!timestamp) {
      return null;
    }
    return Temporal.Instant.from(timestamp).toString();
  } catch (error) {
    logger.error("最終動画同期タイムスタンプの取得に失敗しました", { error });

    return null;
  }
}
