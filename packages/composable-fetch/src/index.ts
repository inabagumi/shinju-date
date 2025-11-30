// Core types and composition

export type { CachedResponse, CacheStorage } from './cache-storage.js'
// Cache storage interfaces
export { generateCacheKey } from './cache-storage.js'
export type { InMemoryCacheStorageOptions } from './in-memory-cache-storage.js'
// Cache storage implementations
export { InMemoryCacheStorage } from './in-memory-cache-storage.js'
export type {
  RedisCacheStorageOptions,
  RedisLike,
} from './redis-cache-storage.js'
export { RedisCacheStorage } from './redis-cache-storage.js'
export type {
  FetchFunction,
  FetchMiddleware,
  MiddlewareOptions,
} from './types.js'
export { composeFetch } from './types.js'
export type { CacheMiddlewareOptions } from './with-cache.js'
// Middlewares
export { withCache } from './with-cache.js'
export type { RetryMiddlewareOptions } from './with-retry.js'
export { withRetry } from './with-retry.js'
