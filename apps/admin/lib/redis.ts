import { type Temporal } from '@js-temporal/polyfill'
import { Redis } from '@upstash/redis'

export async function isDuplicate(key: string, duration: Temporal.Duration) {
  const response = await redisClient.set(key, true, {
    ex: duration.total({ unit: 'second' }),
    nx: true
  })

  return !response
}

export const redisClient = Redis.fromEnv()
