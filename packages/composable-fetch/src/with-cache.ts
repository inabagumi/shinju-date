import type { CachedResponse, CacheStorage } from './cache-storage.js'
import { generateCacheKey } from './cache-storage.js'
import type { FetchMiddleware } from './types.js'

/**
 * Options for the cache middleware
 */
export type CacheMiddlewareOptions = {
  /**
   * Cache storage implementation (e.g., Redis, in-memory)
   */
  storage: CacheStorage

  /**
   * Default TTL (time-to-live) in seconds for cached entries
   * Can be overridden per-request via the 'cache-ttl' header in the Request
   * @default undefined (no TTL, cache never expires unless manually deleted)
   */
  ttl?: number

  /**
   * Whether to use If-None-Match headers for ETag validation
   * @default true
   */
  useETag?: boolean
}

/**
 * Serializes Response headers to a plain object
 */
function serializeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {}
  headers.forEach((value, key) => {
    result[key] = value
  })
  return result
}

/**
 * Deserializes headers from a plain object to Headers
 */
function deserializeHeaders(headers: Record<string, string>): Headers {
  return new Headers(headers)
}

/**
 * Creates a Response object from cached data
 */
function createResponseFromCache(cached: CachedResponse): Response {
  const headers = deserializeHeaders(cached.headers)

  return new Response(cached.body, {
    headers,
    status: cached.status,
    statusText: cached.statusText,
  })
}

/**
 * Middleware that implements ETag-based HTTP caching
 *
 * Features:
 * - Stores responses with ETag headers in cache storage
 * - Sends If-None-Match headers on subsequent requests
 * - Returns cached response on 304 Not Modified
 * - Supports custom TTL per request or globally
 *
 * @example
 * ```typescript
 * const storage = new RedisCacheStorage({ redis: redisClient })
 * const cachedFetch = composeFetch(
 *   withCache(fetch, { storage, ttl: 3600 })
 * )
 *
 * // First request: fetches and caches with ETag
 * const response1 = await cachedFetch('https://api.example.com/data')
 *
 * // Second request: sends If-None-Match, may receive 304
 * const response2 = await cachedFetch('https://api.example.com/data')
 * ```
 */
export const withCache: FetchMiddleware<CacheMiddlewareOptions> = (
  next,
  options,
) => {
  if (!options?.storage) {
    throw new Error('Cache middleware requires a storage option')
  }

  const { storage, ttl: defaultTtl, useETag = true } = options

  return async (input, init) => {
    // Create a Request object to work with
    const request = new Request(input, init)
    const cacheKey = generateCacheKey(request)

    // Only cache GET requests by default
    if (request.method !== 'GET') {
      return next(input, init)
    }

    // Check if there's a cached response
    const cached = await storage.get(cacheKey)

    // If cached and ETag enabled, add If-None-Match header
    if (cached && useETag && cached.etag) {
      const headers = new Headers(request.headers)
      headers.set('If-None-Match', cached.etag)

      // Create new request with If-None-Match header
      const conditionalRequest = new Request(request, { headers })

      // Make the conditional request
      const response = await next(conditionalRequest, init)

      // If 304 Not Modified, return cached response
      if (response.status === 304) {
        return createResponseFromCache(cached)
      }

      // If response has ETag, update cache
      const etag = response.headers.get('ETag')
      if (etag) {
        const body = await response.text()
        const cachedResponse: CachedResponse = {
          body,
          etag,
          headers: serializeHeaders(response.headers),
          status: response.status,
          statusText: response.statusText,
        }

        // Check for per-request TTL in custom header
        const requestTtl = request.headers.get('X-Cache-TTL')
        const ttl = requestTtl ? Number.parseInt(requestTtl, 10) : defaultTtl

        await storage.set(cacheKey, cachedResponse, ttl)

        // Return a new Response with the body
        return new Response(body, {
          headers: response.headers,
          status: response.status,
          statusText: response.statusText,
        })
      }

      return response
    }

    // No cached response, make fresh request
    const response = await next(input, init)

    // If response has ETag, cache it
    if (useETag) {
      const etag = response.headers.get('ETag')
      if (etag) {
        const body = await response.text()
        const cachedResponse: CachedResponse = {
          body,
          etag,
          headers: serializeHeaders(response.headers),
          status: response.status,
          statusText: response.statusText,
        }

        const requestTtl = request.headers.get('X-Cache-TTL')
        const ttl = requestTtl ? Number.parseInt(requestTtl, 10) : defaultTtl

        await storage.set(cacheKey, cachedResponse, ttl)

        // Return a new Response with the body
        return new Response(body, {
          headers: response.headers,
          status: response.status,
          statusText: response.statusText,
        })
      }
    }

    return response
  }
}
