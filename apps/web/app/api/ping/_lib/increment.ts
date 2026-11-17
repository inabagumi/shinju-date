import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import {
  DAILY_TTL_SECONDS,
  dailyKey,
  zincrbyWithTtl,
} from '@/lib/analytics/redis'
import { getRedisClient } from '@/lib/redis'
import type { Video } from './get-video-by-url'

interface IncrementOptions {
  timestamp?: Temporal.ZonedDateTime
}

export default async function increment(
  video: Video,
  {
    timestamp = Temporal.Now.zonedDateTimeISO(TIME_ZONE),
  }: IncrementOptions = {},
): Promise<void> {
  const redisClient = getRedisClient()

  const multi = redisClient.multi()

  zincrbyWithTtl(
    multi,
    dailyKey(REDIS_KEYS.CLICK_VIDEO_PREFIX, timestamp),
    1,
    video.id,
    DAILY_TTL_SECONDS,
  )
  zincrbyWithTtl(
    multi,
    dailyKey(REDIS_KEYS.CLICK_CHANNEL_PREFIX, timestamp),
    1,
    video.talent.id,
    DAILY_TTL_SECONDS,
  )

  await multi.exec()
}
