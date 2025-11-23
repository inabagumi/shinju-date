import { beforeEach, describe, expect, it } from 'vitest'
import type { CachedResponse } from '../cache-storage.js'
import { InMemoryCacheStorage } from '../in-memory-cache-storage.js'

describe('InMemoryCacheStorage', () => {
  let storage: InMemoryCacheStorage

  beforeEach(() => {
    storage = new InMemoryCacheStorage({ ttl: 60 })
  })

  it('should store and retrieve cached responses', async () => {
    const cached: CachedResponse = {
      body: '{"data":"test"}',
      etag: '"abc123"',
      headers: { 'content-type': 'application/json' },
      status: 200,
      statusText: 'OK',
    }

    await storage.set('test-key', cached)
    const retrieved = await storage.get('test-key')

    expect(retrieved).toEqual(cached)
  })

  it('should return null for non-existent keys', async () => {
    const retrieved = await storage.get('non-existent')
    expect(retrieved).toBeNull()
  })

  it('should delete cached entries', async () => {
    const cached: CachedResponse = {
      body: 'test',
      etag: '"123"',
      headers: {},
      status: 200,
      statusText: 'OK',
    }

    await storage.set('test-key', cached)
    await storage.delete('test-key')
    const retrieved = await storage.get('test-key')

    expect(retrieved).toBeNull()
  })

  it('should expire entries after TTL', async () => {
    const shortTtlStorage = new InMemoryCacheStorage({ ttl: 0.1 }) // 100ms

    const cached: CachedResponse = {
      body: 'test',
      etag: '"123"',
      headers: {},
      status: 200,
      statusText: 'OK',
    }

    await shortTtlStorage.set('test-key', cached)

    // Should be available immediately
    let retrieved = await shortTtlStorage.get('test-key')
    expect(retrieved).toEqual(cached)

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150))

    // Should be expired now
    retrieved = await shortTtlStorage.get('test-key')
    expect(retrieved).toBeNull()
  })

  it('should support custom TTL per entry', async () => {
    const cached: CachedResponse = {
      body: 'test',
      etag: '"123"',
      headers: {},
      status: 200,
      statusText: 'OK',
    }

    // Set with custom TTL of 0.1 seconds (100ms)
    await storage.set('test-key', cached, 0.1)

    // Should be available immediately
    let retrieved = await storage.get('test-key')
    expect(retrieved).toEqual(cached)

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150))

    // Should be expired now
    retrieved = await storage.get('test-key')
    expect(retrieved).toBeNull()
  })

  it('should clear all entries', async () => {
    const cached1: CachedResponse = {
      body: 'test1',
      etag: '"123"',
      headers: {},
      status: 200,
      statusText: 'OK',
    }

    const cached2: CachedResponse = {
      body: 'test2',
      etag: '"456"',
      headers: {},
      status: 200,
      statusText: 'OK',
    }

    await storage.set('key1', cached1)
    await storage.set('key2', cached2)

    expect(storage.size()).toBe(2)

    storage.clear()

    expect(storage.size()).toBe(0)
    expect(await storage.get('key1')).toBeNull()
    expect(await storage.get('key2')).toBeNull()
  })

  it('should track cache size', async () => {
    expect(storage.size()).toBe(0)

    const cached: CachedResponse = {
      body: 'test',
      etag: '"123"',
      headers: {},
      status: 200,
      statusText: 'OK',
    }

    await storage.set('key1', cached)
    expect(storage.size()).toBe(1)

    await storage.set('key2', cached)
    expect(storage.size()).toBe(2)

    await storage.delete('key1')
    expect(storage.size()).toBe(1)
  })
})
