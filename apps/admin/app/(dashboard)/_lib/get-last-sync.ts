import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { Temporal } from 'temporal-polyfill'
import { redisClient } from '@/lib/redis'

export async function getLastVideoSync(): Promise<Temporal.ZonedDateTime | null> {
  try {
    const timestamp = await redisClient.get<string>(REDIS_KEYS.LAST_VIDEO_SYNC)
    if (!timestamp) {
      return null
    }
    const instant = Temporal.Instant.from(timestamp)
    return instant.toZonedDateTimeISO(TIME_ZONE)
  } catch (error) {
    logger.error('最終動画同期タイムスタンプの取得に失敗しました', error)
    return null
  }
}
