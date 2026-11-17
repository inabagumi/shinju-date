import { REDIS_KEYS } from '@shinju-date/constants'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getRepeatSearchRate,
  getSearchEngagementRate,
  getSearchExitRates,
} from './get-search-quality-metrics'

// Mock Redis client
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
}))
vi.mock('@/lib/redis', async () => {
  const { createMockPipeline } = await import('@/test/mock-redis-pipeline')
  const mockedRedisClient = {
    hgetall: vi.fn(),
    pipeline: vi.fn(),
    scard: vi.fn(),
    zrange: vi.fn(),
  }
  mockedRedisClient.pipeline.mockImplementation(() =>
    createMockPipeline(mockedRedisClient),
  )
  return {
    getRedisClient: vi.fn().mockReturnValue(mockedRedisClient),
  }
})

// Mock logger
vi.mock('@shinju-date/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getSearchEngagementRate', async () => {
  const { getRedisClient } = await import('@/lib/redis')
  const redisClient = getRedisClient()

  it('should calculate engagement rate correctly', async () => {
    // Mock Redis responses
    vi.mocked(redisClient.scard)
      .mockResolvedValueOnce(100) // total sessions
      .mockResolvedValueOnce(30) // search sessions

    const result = await getSearchEngagementRate({
      range: { end: '2024-01-01', start: '2024-01-01' },
    })

    expect(result).toBe(30) // 30/100 * 100 = 30%
  })

  it('should return null when no sessions exist', async () => {
    vi.mocked(redisClient.scard)
      .mockResolvedValueOnce(0) // total sessions
      .mockResolvedValueOnce(0) // search sessions

    const result = await getSearchEngagementRate({
      range: { end: '2024-01-01', start: '2024-01-01' },
    })

    expect(result).toBeNull()
  })

  it('should return 0 when sessions exist but none of them searched', async () => {
    vi.mocked(redisClient.scard)
      .mockResolvedValueOnce(100) // total sessions
      .mockResolvedValueOnce(0) // search sessions

    const result = await getSearchEngagementRate({
      range: { end: '2024-01-01', start: '2024-01-01' },
    })

    expect(result).toBe(0)
  })

  it('should aggregate a date range in a single pipeline', async () => {
    vi.mocked(redisClient.scard)
      .mockResolvedValueOnce(100) // 2024-01-01 total sessions
      .mockResolvedValueOnce(30) // 2024-01-01 search sessions
      .mockResolvedValueOnce(300) // 2024-01-02 total sessions
      .mockResolvedValueOnce(50) // 2024-01-02 search sessions

    const result = await getSearchEngagementRate({
      range: { end: '2024-01-02', start: '2024-01-01' },
    })

    expect(result).toBe(20) // (30+50) / (100+300) * 100 = 20%
    expect(redisClient.pipeline).toHaveBeenCalledTimes(1)
    expect(vi.mocked(redisClient.scard).mock.calls).toEqual([
      [`${REDIS_KEYS.SESSIONS_TOTAL_PREFIX}20240101`],
      [`${REDIS_KEYS.SESSIONS_WITH_SEARCH_PREFIX}20240101`],
      [`${REDIS_KEYS.SESSIONS_TOTAL_PREFIX}20240102`],
      [`${REDIS_KEYS.SESSIONS_WITH_SEARCH_PREFIX}20240102`],
    ])
  })

  it('should return null without calling Redis for an empty range', async () => {
    const result = await getSearchEngagementRate({
      range: { end: '2024-01-01', start: '2024-01-02' },
    })

    expect(result).toBeNull()
    expect(redisClient.pipeline).not.toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    vi.mocked(redisClient.scard).mockRejectedValue(new Error('Redis error'))

    const result = await getSearchEngagementRate({
      range: { end: '2024-01-01', start: '2024-01-01' },
    })

    expect(result).toBeNull()
  })
})

describe('getSearchExitRates', async () => {
  const { getRedisClient } = await import('@/lib/redis')
  const redisClient = getRedisClient()

  it('should calculate exit rates correctly', async () => {
    // Mock search counts
    vi.mocked(redisClient.zrange).mockResolvedValue([
      'keyword1',
      '100',
      'keyword2',
      '50',
    ])

    // Mock exit counts
    vi.mocked(redisClient.hgetall).mockResolvedValue({
      keyword1: '30',
      keyword2: '10',
    })

    const result = await getSearchExitRates({
      range: { end: '2024-01-01', start: '2024-01-01' },
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      exitRate: 30, // 30/100 * 100
      keyword: 'keyword1',
      searchCount: 100,
    })
    expect(result[1]).toEqual({
      exitRate: 20, // 10/50 * 100
      keyword: 'keyword2',
      searchCount: 50,
    })
  })

  it('should aggregate a date range with one pipeline per data type', async () => {
    vi.mocked(redisClient.zrange)
      .mockResolvedValueOnce(['keyword1', '100', 'keyword2', '50'])
      .mockResolvedValueOnce(['keyword1', '100'])
    vi.mocked(redisClient.hgetall)
      .mockResolvedValueOnce({ keyword1: '30' })
      .mockResolvedValueOnce(null)

    const result = await getSearchExitRates({
      range: { end: '2024-01-02', start: '2024-01-01' },
    })

    expect(result).toEqual([
      {
        exitRate: 15, // 30/200 * 100
        keyword: 'keyword1',
        searchCount: 200,
      },
      {
        exitRate: 0,
        keyword: 'keyword2',
        searchCount: 50,
      },
    ])
    expect(redisClient.pipeline).toHaveBeenCalledTimes(2)
    expect(redisClient.zrange).toHaveBeenCalledTimes(2)
    expect(redisClient.hgetall).toHaveBeenCalledTimes(2)
  })

  it('should handle missing exit data', async () => {
    vi.mocked(redisClient.zrange).mockResolvedValue(['keyword1', '100'])

    vi.mocked(redisClient.hgetall).mockResolvedValue({})

    const result = await getSearchExitRates({
      range: { end: '2024-01-01', start: '2024-01-01' },
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      exitRate: 0,
      keyword: 'keyword1',
      searchCount: 100,
    })
  })
})

describe('getRepeatSearchRate', async () => {
  const { getRedisClient } = await import('@/lib/redis')
  const redisClient = getRedisClient()

  it('should calculate repeat search rate correctly', async () => {
    // Mock session search counts
    vi.mocked(redisClient.hgetall).mockResolvedValue({
      session1: '3',
      session2: '1',
      session3: '2',
    })

    const result = await getRepeatSearchRate({
      range: { end: '2024-01-01', start: '2024-01-01' },
    })

    expect(result).toBe(2) // (3+1+2) / 3 = 2
  })

  it('should aggregate a date range in a single pipeline', async () => {
    vi.mocked(redisClient.hgetall)
      .mockResolvedValueOnce({ session1: '3', session2: '1' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ session3: '5' })

    const result = await getRepeatSearchRate({
      range: { end: '2024-01-03', start: '2024-01-01' },
    })

    expect(result).toBe(3) // (3+1+5) / 3 = 3
    expect(redisClient.pipeline).toHaveBeenCalledTimes(1)
    expect(redisClient.hgetall).toHaveBeenCalledTimes(3)
  })

  it('should return null when no search sessions exist', async () => {
    vi.mocked(redisClient.hgetall).mockResolvedValue({})

    const result = await getRepeatSearchRate({
      range: { end: '2024-01-01', start: '2024-01-01' },
    })

    expect(result).toBeNull()
  })
})
