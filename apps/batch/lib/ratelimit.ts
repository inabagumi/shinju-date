import { Ratelimit } from '@upstash/ratelimit'
import { redisClient } from './redis'

const RATELIMIT_CACHE_KEY_PREFIX = 'ratelimit:cron'

export const talentsUpdate = new Ratelimit({
  analytics: true,
  limiter: Ratelimit.fixedWindow(1, '2h'),
  prefix: RATELIMIT_CACHE_KEY_PREFIX,
  redis: redisClient,
})

export const recommendationQueriesUpdate = new Ratelimit({
  analytics: true,
  limiter: Ratelimit.fixedWindow(1, '20h'),
  prefix: RATELIMIT_CACHE_KEY_PREFIX,
  redis: redisClient,
})

export const videosCheck = new Ratelimit({
  analytics: true,
  limiter: Ratelimit.fixedWindow(1, '30s'),
  prefix: RATELIMIT_CACHE_KEY_PREFIX,
  redis: redisClient,
})

export const videosCheckRecent = new Ratelimit({
  analytics: true,
  limiter: Ratelimit.fixedWindow(1, '25m'),
  prefix: RATELIMIT_CACHE_KEY_PREFIX,
  redis: redisClient,
})

export const videosCheckAll = new Ratelimit({
  analytics: true,
  limiter: Ratelimit.fixedWindow(1, '4d'),
  prefix: RATELIMIT_CACHE_KEY_PREFIX,
  redis: redisClient,
})

export const videosUpdate = new Ratelimit({
  analytics: true,
  limiter: Ratelimit.fixedWindow(1, '90s'),
  prefix: RATELIMIT_CACHE_KEY_PREFIX,
  redis: redisClient,
})

export const statsSnapshot = new Ratelimit({
  analytics: true,
  limiter: Ratelimit.fixedWindow(1, '20h'),
  prefix: RATELIMIT_CACHE_KEY_PREFIX,
  redis: redisClient,
})
