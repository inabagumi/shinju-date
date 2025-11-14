import type { Redis } from '@upstash/redis'

let _redisClient: Redis | null = null

/**
 * Get Redis client instance (lazy initialization)
 * The client is created on first access, not at import time
 */
export function getRedisClient(): Redis {
  if (!_redisClient) {
    // Dynamic import to ensure this only runs at runtime, not at build time
    const { Redis } = require('@upstash/redis')
    _redisClient = Redis.fromEnv({
      cache: 'default',
    })
  }
  return _redisClient
}
