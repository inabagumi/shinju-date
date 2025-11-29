import { Redis } from '@upstash/redis'

let redisClient: Redis | undefined

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = Redis.fromEnv({
      cache: 'default',
    })
  }

  return redisClient
}
