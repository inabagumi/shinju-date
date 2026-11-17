import { REDIS_KEYS } from '@shinju-date/constants'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRedisClient } from '@/lib/redis'
import { getAnalyticsSummary } from './get-analytics-summary'

vi.mock('@/lib/redis', () => ({
  getRedisClient: vi.fn(),
}))

describe('getAnalyticsSummary', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should count the keywords of the all-time popular searches', async () => {
    const zcard = vi.fn(async (key: string) =>
      key === REDIS_KEYS.SEARCH_POPULAR_ALL_TIME ? 12 : 0,
    )
    vi.mocked(getRedisClient).mockReturnValue({
      get: vi.fn().mockResolvedValue(null),
      zcard,
      zrange: vi.fn().mockResolvedValue([]),
    } as never)

    const result = await getAnalyticsSummary()

    expect(zcard).toHaveBeenCalledWith(REDIS_KEYS.SEARCH_POPULAR_ALL_TIME)
    expect(result.totalPopularKeywords.current).toBe(12)
  })
})
