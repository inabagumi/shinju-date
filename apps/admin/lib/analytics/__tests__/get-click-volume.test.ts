import { REDIS_KEYS } from '@shinju-date/constants'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getClickVolume } from '../get-click-volume'

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
}))
vi.mock('@/lib/redis', async () => {
  const { createMockPipeline } = await import('./mock-redis-pipeline')
  const mockedRedisClient = {
    pipeline: vi.fn(),
    zrange: vi.fn(),
  }
  mockedRedisClient.pipeline.mockImplementation(() =>
    createMockPipeline(mockedRedisClient),
  )
  return {
    getRedisClient: vi.fn().mockReturnValue(mockedRedisClient),
  }
})

vi.mock('@shinju-date/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

describe('getClickVolume', async () => {
  const { getRedisClient } = await import('@/lib/redis')
  const redisClient = getRedisClient()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(redisClient.zrange).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should sum the clicks of each day in a single pipeline', async () => {
    vi.mocked(redisClient.zrange)
      .mockResolvedValueOnce(['video1', '3', 'video2', '2'])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['video1', '10'])

    const result = await getClickVolume('2024-01-30', '2024-02-01')

    expect(result).toEqual([
      { clicks: 5, date: '2024-01-30' },
      { clicks: 0, date: '2024-01-31' },
      { clicks: 10, date: '2024-02-01' },
    ])
    expect(redisClient.pipeline).toHaveBeenCalledTimes(1)
    expect(vi.mocked(redisClient.zrange).mock.calls).toEqual([
      [
        `${REDIS_KEYS.CLICK_VIDEO_PREFIX}20240130`,
        0,
        -1,
        { rev: false, withScores: true },
      ],
      [
        `${REDIS_KEYS.CLICK_VIDEO_PREFIX}20240131`,
        0,
        -1,
        { rev: false, withScores: true },
      ],
      [
        `${REDIS_KEYS.CLICK_VIDEO_PREFIX}20240201`,
        0,
        -1,
        { rev: false, withScores: true },
      ],
    ])
  })

  it('should return an empty array without calling Redis for an empty range', async () => {
    const result = await getClickVolume('2024-02-01', '2024-01-31')

    expect(result).toEqual([])
    expect(redisClient.pipeline).not.toHaveBeenCalled()
  })

  it('should return an empty array when Redis fails', async () => {
    vi.mocked(redisClient.zrange).mockRejectedValue(new Error('Redis error'))

    const result = await getClickVolume('2024-01-30', '2024-02-01')

    expect(result).toEqual([])
  })
})
