import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CachedResponse } from '../cache-storage.js'
import type { RedisLike } from '../redis-cache-storage.js'
import { RedisCacheStorage } from '../redis-cache-storage.js'

describe('RedisCacheStorage', () => {
  let mockRedis: RedisLike
  let storage: RedisCacheStorage

  beforeEach(() => {
    // Create a mock Redis client
    mockRedis = {
      del: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
    }

    storage = new RedisCacheStorage({
      keyPrefix: 'test:',
      redis: mockRedis,
      ttl: 3600,
    })
  })

  it('should store and retrieve cached responses', async () => {
    const cached: CachedResponse = {
      body: '{"data":"test"}',
      etag: '"abc123"',
      headers: { 'content-type': 'application/json' },
      status: 200,
      statusText: 'OK',
    }

    // Mock Redis get to return our cached data
    vi.mocked(mockRedis.get).mockResolvedValue(JSON.stringify(cached))

    await storage.set('test-key', cached)
    const retrieved = await storage.get('test-key')

    expect(mockRedis.set).toHaveBeenCalledWith(
      'test:test-key',
      JSON.stringify(cached),
      { ex: 3600 },
    )
    expect(mockRedis.get).toHaveBeenCalledWith('test:test-key')
    expect(retrieved).toEqual(cached)
  })

  it('should return null for non-existent keys', async () => {
    vi.mocked(mockRedis.get).mockResolvedValue(null)

    const retrieved = await storage.get('non-existent')

    expect(mockRedis.get).toHaveBeenCalledWith('test:non-existent')
    expect(retrieved).toBeNull()
  })

  it('should delete cached entries', async () => {
    vi.mocked(mockRedis.del).mockResolvedValue(1)

    await storage.delete('test-key')

    expect(mockRedis.del).toHaveBeenCalledWith('test:test-key')
  })

  it('should use custom TTL when provided', async () => {
    const cached: CachedResponse = {
      body: 'test',
      etag: '"123"',
      headers: {},
      status: 200,
      statusText: 'OK',
    }

    await storage.set('test-key', cached, 7200)

    expect(mockRedis.set).toHaveBeenCalledWith(
      'test:test-key',
      JSON.stringify(cached),
      { ex: 7200 },
    )
  })

  it('should use default TTL when custom TTL not provided', async () => {
    const cached: CachedResponse = {
      body: 'test',
      etag: '"123"',
      headers: {},
      status: 200,
      statusText: 'OK',
    }

    await storage.set('test-key', cached)

    expect(mockRedis.set).toHaveBeenCalledWith(
      'test:test-key',
      JSON.stringify(cached),
      { ex: 3600 },
    )
  })

  it('should use default key prefix when not provided', () => {
    const defaultStorage = new RedisCacheStorage({ redis: mockRedis })

    // Access private property for testing (not ideal but necessary here)
    expect(defaultStorage['keyPrefix']).toBe('etag:cache:')
  })

  it('should handle invalid JSON gracefully', async () => {
    vi.mocked(mockRedis.get).mockResolvedValue('invalid json')
    vi.mocked(mockRedis.del).mockResolvedValue(1)

    const retrieved = await storage.get('test-key')

    expect(retrieved).toBeNull()
    expect(mockRedis.del).toHaveBeenCalledWith('test:test-key')
  })

  it('should use custom key prefix', async () => {
    const customStorage = new RedisCacheStorage({
      keyPrefix: 'custom:prefix:',
      redis: mockRedis,
    })

    const cached: CachedResponse = {
      body: 'test',
      etag: '"123"',
      headers: {},
      status: 200,
      statusText: 'OK',
    }

    await customStorage.set('test-key', cached)

    expect(mockRedis.set).toHaveBeenCalledWith(
      'custom:prefix:test-key',
      expect.any(String),
      expect.any(Object),
    )
  })
})
