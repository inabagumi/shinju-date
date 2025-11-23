import type { CachedResponse, CacheStorage } from './cache-storage.js'

/**
 * Options for in-memory cache storage
 */
export type InMemoryCacheStorageOptions = {
  /**
   * Default TTL (time-to-live) in seconds for cached entries
   * @default 3600 (1 hour)
   */
  ttl?: number
}

/**
 * Entry in the in-memory cache with expiration time
 */
type CacheEntry = {
  expiresAt: number
  value: CachedResponse
}

/**
 * In-memory implementation of CacheStorage
 * Useful for testing and development without Redis dependency
 */
export class InMemoryCacheStorage implements CacheStorage {
  private readonly cache = new Map<string, CacheEntry>()
  private readonly defaultTtl: number

  constructor(options: InMemoryCacheStorageOptions = {}) {
    this.defaultTtl = options.ttl ?? 3600 // 1 hour default
  }

  async get(key: string): Promise<CachedResponse | null> {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  async set(key: string, value: CachedResponse, ttl?: number): Promise<void> {
    const expiration = ttl ?? this.defaultTtl
    const expiresAt = Date.now() + expiration * 1000

    this.cache.set(key, {
      expiresAt,
      value,
    })
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }

  /**
   * Clears all cached entries
   * Useful for testing
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Returns the number of cached entries
   * Useful for testing and monitoring
   */
  size(): number {
    return this.cache.size
  }
}
