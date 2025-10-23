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
  const videoKey = `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${keySuffix}`
  const channelKey = `${REDIS_KEYS.CLICK_CHANNEL_PREFIX}${keySuffix}`

  const multi = redisClient.multi()

  multi.zincrby(videoKey, 1, video.id)
  multi.zincrby(channelKey, 1, video.channel.id)

  // Set TTL for click analytics keys in the same pipeline
  multi.expire(videoKey, DAILY_TTL_SECONDS)
  multi.expire(channelKey, DAILY_TTL_SECONDS)

  await multi.exec()
}
