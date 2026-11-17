import { CACHE_TAGS, REDIS_KEYS } from '@shinju-date/constants'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const limit = vi.fn()
const revalidateTags = vi.fn()
const multi = {
  del: vi.fn(),
  exec: vi.fn(),
  zadd: vi.fn(),
}
const redisClient = {
  del: vi.fn(),
  exists: vi.fn(),
  multi: vi.fn(() => multi),
  zrange: vi.fn(),
  zunionstore: vi.fn(),
}
const getAllTerms = vi.fn()

vi.mock('@/lib/ratelimit', () => ({
  recommendationQueriesUpdate: { limit },
  statsSnapshot: { limit: vi.fn() },
  talentsUpdate: { limit: vi.fn() },
  termsPopularityUpdate: { limit: vi.fn() },
  videosBackfill: { limit: vi.fn() },
  videosCascadeFromTalents: { limit: vi.fn() },
  videosCheck: { limit: vi.fn() },
  videosCheckAll: { limit: vi.fn() },
  videosCheckRecent: { limit: vi.fn() },
  videosUpdate: { limit: vi.fn() },
}))
vi.mock('@/lib/redis', () => ({ redisClient }))
vi.mock('@/lib/supabase', () => ({ supabaseClient: {} }))
vi.mock('../_lib/get-all-terms', () => ({ getAllTerms }))
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

const { POST } = await import('../route')

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
    limit.mockResolvedValue({ success: true })
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
    expect(multi.exec).toHaveBeenCalledTimes(1)
    expect(revalidateTags).toHaveBeenCalledWith(
      [CACHE_TAGS.RECOMMENDATION_QUERIES],
      expect.anything(),
    )
    expect(revalidateTags).toHaveBeenCalledTimes(1)
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

  it('does not run within the rate limit window', async () => {
    limit.mockResolvedValue({ success: false })

    const response = await POST(createRequest())

    expect(response.status).toBe(429)
    expect(redisClient.exists).not.toHaveBeenCalled()
    expect(revalidateTags).not.toHaveBeenCalled()
  })
})
