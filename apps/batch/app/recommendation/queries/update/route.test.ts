import { CACHE_TAGS, REDIS_KEYS } from '@shinju-date/constants'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const acquireLock = vi.fn()
const releaseLock = vi.fn()
const revalidateTags = vi.fn()
const multi = {
  del: vi.fn(),
  exec: vi.fn(),
  expire: vi.fn(),
  zadd: vi.fn(),
}
const redisClient = {
  del: vi.fn(),
  exists: vi.fn(),
  expire: vi.fn(),
  multi: vi.fn(() => multi),
  zrange: vi.fn(),
  zunionstore: vi.fn(),
}
const getAllTerms = vi.fn()

vi.mock('@/lib/lock', () => ({ acquireLock, releaseLock }))
vi.mock('@/lib/redis', () => ({ redisClient }))
vi.mock('@/lib/supabase', () => ({ supabaseClient: {} }))
vi.mock('./_lib/get-all-terms', () => ({ getAllTerms }))
vi.mock('@shinju-date/web-cache', () => ({ revalidateTags }))

const captureCheckIn = vi.fn(() => 'check-in-id')
const captureException = vi.fn()

vi.mock('@sentry/nextjs', () => ({
  captureCheckIn,
  captureException,
  flush: vi.fn(),
}))

vi.mock('@shinju-date/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: vi.fn((callback: () => unknown) => callback()),
}))

const { POST } = await import('./route')

function createRequest(): NextRequest {
  return new NextRequest(
    'http://localhost:5000/recommendation/queries/update',
    {
      method: 'POST',
    },
  )
}

describe('POST /recommendation/queries/update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    acquireLock.mockResolvedValue('lock-value')
    redisClient.del.mockResolvedValue(1)
    getAllTerms.mockImplementation(async function* () {
      yield { synonyms: ['ほげ'], term: 'Hoge' }
      yield { synonyms: [], term: 'Fuga' }
    })
  })

  it('saves the matching queries and revalidates the recommendation queries', async () => {
    redisClient.exists.mockResolvedValue(1)
    redisClient.zrange.mockResolvedValue([
      'ほげ',
      '30',
      'fuga',
      '20',
      'unknown',
      '10',
    ])

    const response = await POST(createRequest())

    expect(response.status).toBe(204)
    expect(multi.del).toHaveBeenCalledWith(REDIS_KEYS.QUERIES_AUTO_RECOMMENDED)
    expect(multi.zadd).toHaveBeenCalledWith(
      REDIS_KEYS.QUERIES_AUTO_RECOMMENDED,
      { member: 'Hoge', score: 30 },
    )
    expect(multi.zadd).toHaveBeenCalledWith(
      REDIS_KEYS.QUERIES_AUTO_RECOMMENDED,
      { member: 'Fuga', score: 20 },
    )
    expect(multi.zadd).toHaveBeenCalledTimes(2)
    expect(multi.expire).toHaveBeenCalledWith(
      REDIS_KEYS.QUERIES_AUTO_RECOMMENDED,
      8 * 24 * 60 * 60,
    )
    expect(multi.exec).toHaveBeenCalledTimes(1)
    expect(revalidateTags).toHaveBeenCalledWith(
      [CACHE_TAGS.RECOMMENDATION_QUERIES],
      expect.anything(),
    )
    expect(revalidateTags).toHaveBeenCalledTimes(1)
  })

  it('keeps the working key of the union for 10 minutes and deletes it afterwards', async () => {
    redisClient.exists.mockResolvedValue(1)
    redisClient.zrange.mockResolvedValue(['ほげ', '30'])

    const response = await POST(createRequest())

    expect(response.status).toBe(204)
    expect(redisClient.zunionstore).toHaveBeenCalledWith(
      REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION,
      3,
      expect.any(Array),
    )
    expect(redisClient.expire).toHaveBeenCalledWith(
      REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION,
      10 * 60,
    )
    expect(redisClient.expire.mock.invocationCallOrder[0]).toBeGreaterThan(
      redisClient.zunionstore.mock.invocationCallOrder[0] ?? 0,
    )
    expect(redisClient.del).toHaveBeenCalledWith(
      REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION,
    )
    expect(multi.del).not.toHaveBeenCalledWith(
      REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION,
    )
  })

  it('does not set an expiry on the auto recommended queries when none match', async () => {
    redisClient.exists.mockResolvedValue(1)
    redisClient.zrange.mockResolvedValue(['unknown', '10'])

    const response = await POST(createRequest())

    expect(response.status).toBe(204)
    expect(multi.del).toHaveBeenCalledWith(REDIS_KEYS.QUERIES_AUTO_RECOMMENDED)
    expect(multi.zadd).not.toHaveBeenCalled()
    expect(multi.expire).not.toHaveBeenCalled()
  })

  it('deletes the working key of the union when reading it fails', async () => {
    const error = new Error('Redis is down')

    redisClient.exists.mockResolvedValue(1)
    redisClient.zrange.mockRejectedValueOnce(error)

    const response = await POST(createRequest())

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Redis is down' })
    expect(redisClient.del).toHaveBeenCalledWith(
      REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION,
    )
    expect(multi.exec).not.toHaveBeenCalled()
    expect(revalidateTags).not.toHaveBeenCalled()
  })

  it('reports the original error when deleting the working key also fails', async () => {
    const error = new Error('Redis is down')

    redisClient.exists.mockResolvedValue(1)
    redisClient.zrange.mockRejectedValueOnce(error)
    redisClient.del.mockRejectedValueOnce(new Error('Connection lost'))

    const response = await POST(createRequest())

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Redis is down' })
    expect(captureException).toHaveBeenCalledWith(error)
  })

  it('clears the auto recommended queries and revalidates when there is no search data', async () => {
    redisClient.exists.mockResolvedValue(0)

    const response = await POST(createRequest())

    expect(response.status).toBe(204)
    expect(redisClient.del).toHaveBeenCalledWith(
      REDIS_KEYS.QUERIES_AUTO_RECOMMENDED,
    )
    expect(redisClient.zunionstore).not.toHaveBeenCalled()
    expect(revalidateTags).toHaveBeenCalledWith(
      [CACHE_TAGS.RECOMMENDATION_QUERIES],
      expect.anything(),
    )
  })

  it('reports the error and does not revalidate when the update fails', async () => {
    const error = new Error('Redis is down')

    redisClient.exists.mockResolvedValue(1)
    redisClient.zrange.mockResolvedValue(['ほげ', '30'])
    multi.exec.mockRejectedValueOnce(error)

    const response = await POST(createRequest())

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Redis is down' })
    expect(revalidateTags).not.toHaveBeenCalled()
    expect(captureException).toHaveBeenCalledWith(error)
    expect(captureCheckIn).toHaveBeenLastCalledWith({
      checkInId: 'check-in-id',
      monitorSlug: '/recommendation/queries/update',
      status: 'error',
    })
  })

  it('does not run while the previous run is still running', async () => {
    acquireLock.mockResolvedValue(null)

    const response = await POST(createRequest())

    expect(response.status).toBe(429)
    expect(redisClient.exists).not.toHaveBeenCalled()
    expect(revalidateTags).not.toHaveBeenCalled()
  })
})
