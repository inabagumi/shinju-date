import type { CachedResponse, CacheStorage } from './cache-storage.js'

/**
 * Redis-like interface for cache operations
 * This allows dependency injection of any Redis-compatible client
 */
export interface RedisLike {
  /**
   * Deletes a key from Redis
   */
  del(key: string): Promise<number>

  /**
   * Gets a value from Redis
   */
  get<T = string>(key: string): Promise<T | null>

  /**
   * Sets a value in Redis with optional expiration
   */
  set(key: string, value: string, options?: { ex?: number }): Promise<string>
}

/**
 * Options for Redis cache storage
 */
export type RedisCacheStorageOptions = {
  /**
   * Key prefix for all cache entries
   * @default "etag:cache:"
   */
  keyPrefix?: string

  /**
   * Redis client instance
   */
  redis: RedisLike

  /**
   * Default TTL (time-to-live) in seconds for cached entries
   * @default 3600 (1 hour)
   */
  ttl?: number
}

/**
 * Redis-based implementation of CacheStorage
 * Stores ETag-based HTTP responses in Redis
 */
export class RedisCacheStorage implements CacheStorage {
  private readonly keyPrefix: string
  private readonly redis: RedisLike
  private readonly defaultTtl: number

  constructor(options: RedisCacheStorageOptions) {
    this.redis = options.redis
    this.keyPrefix = options.keyPrefix ?? 'etag:cache:'
    this.defaultTtl = options.ttl ?? 3600 // 1 hour default
  }

  async get(key: string): Promise<CachedResponse | null> {
    const fullKey = `${this.keyPrefix}${key}`
    const cached = await this.redis.get<string>(fullKey)

    if (!cached) {
      return null
    }

    try {
      return JSON.parse(cached) as CachedResponse
    } catch {
      // Invalid JSON, delete and return null
      await this.redis.del(fullKey)
      return null
    }
  }

  async set(key: string, value: CachedResponse, ttl?: number): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`
    const serialized = JSON.stringify(value)
    const expiration = ttl ?? this.defaultTtl

    await this.redis.set(fullKey, serialized, { ex: expiration })
  }

  async delete(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`
    await this.redis.del(fullKey)
  }
}
