import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CacheStorage } from '../cache-storage.js'
import { InMemoryCacheStorage } from '../in-memory-cache-storage.js'
import { withCache } from '../with-cache.js'

describe('withCache middleware', () => {
  let storage: CacheStorage
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    storage = new InMemoryCacheStorage({ ttl: 3600 })
    mockFetch = vi.fn()
  })

  it('should throw error if storage is not provided', () => {
    expect(() => {
      withCache(fetch, undefined as never)
    }).toThrow('Cache middleware requires a storage option')
  })

  it('should cache responses with ETag', async () => {
    const responseBody = '{"data":"test"}'
    const etag = '"abc123"'

    mockFetch.mockResolvedValue(
      new Response(responseBody, {
        headers: { ETag: etag },
        status: 200,
      }),
    )

    const cachedFetch = withCache(mockFetch, { storage })
    const response = await cachedFetch('https://api.example.com/data')

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(responseBody)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Check that response was cached
    const cached = await storage.get('GET:https://api.example.com/data')
    expect(cached).not.toBeNull()
    expect(cached?.etag).toBe(etag)
    expect(cached?.body).toBe(responseBody)
  })

  it('should send If-None-Match header on subsequent requests', async () => {
    const responseBody = '{"data":"test"}'
    const etag = '"abc123"'

    // First request
    mockFetch.mockResolvedValueOnce(
      new Response(responseBody, {
        headers: { ETag: etag },
        status: 200,
      }),
    )

    const cachedFetch = withCache(mockFetch, { storage })
    await cachedFetch('https://api.example.com/data')

    // Second request - mock 304 response
    mockFetch.mockResolvedValueOnce(
      new Response(null, {
        status: 304,
      }),
    )

    const response2 = await cachedFetch('https://api.example.com/data')

    // Should have sent If-None-Match header
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const secondCallRequest = mockFetch.mock.calls[1][0] as Request
    expect(secondCallRequest.headers.get('If-None-Match')).toBe(etag)

    // Should return cached response
    expect(response2.status).toBe(200)
    expect(await response2.text()).toBe(responseBody)
  })

  it('should update cache on non-304 responses', async () => {
    const etag1 = '"abc123"'
    const etag2 = '"def456"'
    const body1 = '{"data":"old"}'
    const body2 = '{"data":"new"}'

    // First request
    mockFetch.mockResolvedValueOnce(
      new Response(body1, {
        headers: { ETag: etag1 },
        status: 200,
      }),
    )

    const cachedFetch = withCache(mockFetch, { storage })
    await cachedFetch('https://api.example.com/data')

    // Second request - return updated response
    mockFetch.mockResolvedValueOnce(
      new Response(body2, {
        headers: { ETag: etag2 },
        status: 200,
      }),
    )

    const response2 = await cachedFetch('https://api.example.com/data')

    expect(response2.status).toBe(200)
    expect(await response2.text()).toBe(body2)

    // Cache should be updated
    const cached = await storage.get('GET:https://api.example.com/data')
    expect(cached?.etag).toBe(etag2)
    expect(cached?.body).toBe(body2)
  })

  it('should not cache non-GET requests', async () => {
    mockFetch.mockResolvedValue(
      new Response('{"status":"ok"}', {
        headers: { ETag: '"abc123"' },
        status: 200,
      }),
    )

    const cachedFetch = withCache(mockFetch, { storage })
    await cachedFetch('https://api.example.com/data', { method: 'POST' })

    // Should not be cached
    const cached = await storage.get('POST:https://api.example.com/data')
    expect(cached).toBeNull()
  })

  it('should not cache responses without ETag', async () => {
    mockFetch.mockResolvedValue(
      new Response('{"data":"test"}', {
        status: 200,
      }),
    )

    const cachedFetch = withCache(mockFetch, { storage })
    await cachedFetch('https://api.example.com/data')

    // Should not be cached
    const cached = await storage.get('GET:https://api.example.com/data')
    expect(cached).toBeNull()
  })

  it('should respect custom TTL from X-Cache-TTL header', async () => {
    const mockStorage = {
      delete: vi.fn(),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
    }

    mockFetch.mockResolvedValue(
      new Response('{"data":"test"}', {
        headers: { ETag: '"abc123"' },
        status: 200,
      }),
    )

    const cachedFetch = withCache(mockFetch, { storage: mockStorage })
    await cachedFetch('https://api.example.com/data', {
      headers: { 'X-Cache-TTL': '7200' },
    })

    expect(mockStorage.set).toHaveBeenCalledWith(
      'GET:https://api.example.com/data',
      expect.any(Object),
      7200,
    )
  })

  it('should work with useETag=false', async () => {
    const responseBody = '{"data":"test"}'

    mockFetch.mockResolvedValue(
      new Response(responseBody, {
        headers: { ETag: '"abc123"' },
        status: 200,
      }),
    )

    const cachedFetch = withCache(mockFetch, { storage, useETag: false })
    const response = await cachedFetch('https://api.example.com/data')

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(responseBody)

    // Should not cache when useETag is false
    const cached = await storage.get('GET:https://api.example.com/data')
    expect(cached).toBeNull()
  })

  it('should handle Request objects as input', async () => {
    const responseBody = '{"data":"test"}'
    const etag = '"abc123"'

    mockFetch.mockResolvedValue(
      new Response(responseBody, {
        headers: { ETag: etag },
        status: 200,
      }),
    )

    const cachedFetch = withCache(mockFetch, { storage })
    const request = new Request('https://api.example.com/data')
    const response = await cachedFetch(request)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(responseBody)

    // Check that response was cached
    const cached = await storage.get('GET:https://api.example.com/data')
    expect(cached).not.toBeNull()
  })
})
