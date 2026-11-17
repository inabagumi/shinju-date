import { REDIS_KEYS } from '@shinju-date/constants'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSearchVolume } from './get-search-volume'

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
}))
vi.mock('@/lib/redis', async () => {
  const { createMockPipeline } = await import('@/test/mock-redis-pipeline')
  const mockedRedisClient = {
    get: vi.fn(),
    pipeline: vi.fn(),
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

describe('getSearchVolume', async () => {
  const { getRedisClient } = await import('@/lib/redis')
  const redisClient = getRedisClient()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(redisClient.get).mockReset()
  })

  it('should get the count of each day in a single pipeline', async () => {
    vi.mocked(redisClient.get)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(3)

    const result = await getSearchVolume({
      range: { end: '2024-02-01', start: '2024-01-30' },
    })

    expect(result).toEqual([
      { count: 12, date: '2024-01-30' },
      { count: 0, date: '2024-01-31' },
      { count: 3, date: '2024-02-01' },
    ])
    expect(redisClient.pipeline).toHaveBeenCalledTimes(1)
    expect(vi.mocked(redisClient.get).mock.calls).toEqual([
      [`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20240130`],
      [`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20240131`],
      [`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20240201`],
    ])
  })

  it('should return an empty array without calling Redis for an empty range', async () => {
    const result = await getSearchVolume({
      range: { end: '2024-01-31', start: '2024-02-01' },
    })

    expect(result).toEqual([])
    expect(redisClient.pipeline).not.toHaveBeenCalled()
  })

  it('should return an empty array when Redis fails', async () => {
    vi.mocked(redisClient.get).mockRejectedValue(new Error('Redis error'))

    const result = await getSearchVolume({
      range: { end: '2024-02-01', start: '2024-01-30' },
    })

    expect(result).toEqual([])
  })
})
