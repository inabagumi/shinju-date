import { Temporal } from 'temporal-polyfill'
import { timeZone } from '@/lib/constants'
import { redisClient } from '@/lib/redis'
import { type Video } from './types'

function format(timestamp: Temporal.ZonedDateTime): string {
  return [
    timestamp.year.toString(10).padStart(4, '0'),
    timestamp.month.toString(10).padStart(2, '0'),
    timestamp.day.toString(10).padStart(2, '0')
  ].join('')
}

type IncrementOptions = {
  timestamp?: Temporal.ZonedDateTime
}

export default async function increment(
  video: Video,
  { timestamp = Temporal.Now.zonedDateTimeISO(timeZone) }: IncrementOptions = {}
): Promise<void> {
  const keySuffix = format(timestamp)
  const multi = redisClient.multi()

  multi.zincrby(`videos:clicked:${keySuffix}`, 1, video.id)
  multi.zincrby(`channels:clicked:${keySuffix}`, 1, video.channel.id)

  await multi.exec()
}
