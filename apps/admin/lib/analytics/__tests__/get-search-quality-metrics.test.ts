import { Temporal } from 'temporal-polyfill'
import { describe, expect, it, vi } from 'vitest'
import {
  getRepeatSearchRate,
  getSearchEngagementRate,
  getSearchExitRates,
} from '../get-search-quality-metrics'

// Mock Redis client
vi.mock('@/lib/redis', () => ({
  redisClient: {
    hgetall: vi.fn(),
    scard: vi.fn(),
    zrange: vi.fn(),
  },
}))

// Mock logger
vi.mock('@shinju-date/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

describe('getSearchEngagementRate', () => {
  it('should calculate engagement rate correctly', async () => {
    const { redisClient } = await import('@/lib/redis')

    // Mock Redis responses
    vi.mocked(redisClient.scard)
      .mockResolvedValueOnce(100) // total sessions
      .mockResolvedValueOnce(30) // search sessions

    const result = await getSearchEngagementRate(
      Temporal.PlainDate.from('2024-01-01'),
    )

    expect(result).toBe(30) // 30/100 * 100 = 30%
  })

  it('should return 0 when no sessions exist', async () => {
    const { redisClient } = await import('@/lib/redis')

    vi.mocked(redisClient.scard)
      .mockResolvedValueOnce(0) // total sessions
      .mockResolvedValueOnce(0) // search sessions

    const result = await getSearchEngagementRate(
      Temporal.PlainDate.from('2024-01-01'),
    )

    expect(result).toBe(0)
  })

  it('should handle errors gracefully', async () => {
    const { redisClient } = await import('@/lib/redis')

    vi.mocked(redisClient.scard).mockRejectedValue(new Error('Redis error'))

    const result = await getSearchEngagementRate(
      Temporal.PlainDate.from('2024-01-01'),
    )

    expect(result).toBe(0)
  })
})

describe('getSearchExitRates', () => {
  it('should calculate exit rates correctly', async () => {
    const { redisClient } = await import('@/lib/redis')

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

    const result = await getSearchExitRates(
      Temporal.PlainDate.from('2024-01-01'),
    )

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

  it('should handle missing exit data', async () => {
    const { redisClient } = await import('@/lib/redis')

    vi.mocked(redisClient.zrange).mockResolvedValue(['keyword1', '100'])

    vi.mocked(redisClient.hgetall).mockResolvedValue({})

    const result = await getSearchExitRates(
      Temporal.PlainDate.from('2024-01-01'),
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      exitRate: 0,
      keyword: 'keyword1',
      searchCount: 100,
    })
  })
})

describe('getRepeatSearchRate', () => {
  it('should calculate repeat search rate correctly', async () => {
    const { redisClient } = await import('@/lib/redis')

    // Mock session search counts
    vi.mocked(redisClient.hgetall).mockResolvedValue({
      session1: '3',
      session2: '1',
      session3: '2',
    })

    const result = await getRepeatSearchRate(
      Temporal.PlainDate.from('2024-01-01'),
    )

    expect(result).toBe(2) // (3+1+2) / 3 = 2
  })

  it('should return 0 when no search sessions exist', async () => {
    const { redisClient } = await import('@/lib/redis')

    vi.mocked(redisClient.hgetall).mockResolvedValue({})

    const result = await getRepeatSearchRate(
      Temporal.PlainDate.from('2024-01-01'),
    )

    expect(result).toBe(0)
  })
})
