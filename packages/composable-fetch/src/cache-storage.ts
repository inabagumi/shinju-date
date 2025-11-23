/**
 * Represents a cached HTTP response with ETag metadata
 */
export type CachedResponse = {
  /**
   * The cached response body (as text, to avoid serialization issues)
   */
  body: string

  /**
   * The ETag value from the original response
   */
  etag: string

  /**
   * HTTP response headers (serialized as key-value pairs)
   */
  headers: Record<string, string>

  /**
   * HTTP status code
   */
  status: number

  /**
   * HTTP status text
   */
  statusText: string
}

/**
 * Abstract interface for cache storage
 * Implementations can use Redis, in-memory storage, or other backends
 */
export interface CacheStorage {
  /**
   * Deletes a cached response by key
   * @param key - The cache key
   */
  delete(key: string): Promise<void>

  /**
   * Retrieves a cached response by key
   * @param key - The cache key
   * @returns The cached response, or null if not found
   */
  get(key: string): Promise<CachedResponse | null>

  /**
   * Stores a response in the cache
   * @param key - The cache key
   * @param value - The response to cache
   * @param ttl - Optional time-to-live in seconds
   */
  set(key: string, value: CachedResponse, ttl?: number): Promise<void>
}

/**
 * Generates a cache key from a Request object
 * @param request - The fetch request
 * @returns A unique cache key string
 */
export function generateCacheKey(request: Request | string): string {
  const url = typeof request === 'string' ? request : request.url
  const method = typeof request === 'string' ? 'GET' : request.method

  // Use method:url as the cache key
  return `${method}:${url}`
}
