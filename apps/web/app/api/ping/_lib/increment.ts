import { REDIS_KEYS } from '@shinju-date/constants'
import { Temporal } from 'temporal-polyfill'
import { timeZone } from '@/lib/constants'
import { redisClient } from '@/lib/redis'
import type { Video } from './types'

// TTL settings for click analytics keys
const DAILY_TTL_SECONDS = 90 * 24 * 60 * 60 // 90 days

function format(timestamp: Temporal.ZonedDateTime): string {
  return [
    timestamp.year.toString(10).padStart(4, '0'),
    timestamp.month.toString(10).padStart(2, '0'),
    timestamp.day.toString(10).padStart(2, '0'),
  ].join('')
}

type IncrementOptions = {
  timestamp?: Temporal.ZonedDateTime
}

export default async function increment(
  video: Video,
  {
    timestamp = Temporal.Now.zonedDateTimeISO(timeZone),
  }: IncrementOptions = {},
): Promise<void> {
  const keySuffix = format(timestamp)
  const multi = redisClient.multi()

  multi.zincrby(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}${keySuffix}`, 1, video.id)
  multi.zincrby(
    `${REDIS_KEYS.CLICK_CHANNEL_PREFIX}${keySuffix}`,
    1,
    video.channel.id,
  )

  await multi.exec()

  // Set TTL for click analytics keys after incrementing
  // We do this separately to avoid blocking the main operations
  const ttlOperations: Promise<unknown>[] = [
    // Video click key: 90 days TTL
    redisClient.expire(
      `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${keySuffix}`,
      DAILY_TTL_SECONDS,
    ),
    // Channel click key: 90 days TTL
    redisClient.expire(
      `${REDIS_KEYS.CLICK_CHANNEL_PREFIX}${keySuffix}`,
      DAILY_TTL_SECONDS,
    ),
  ]

  await Promise.all(ttlOperations)
}
