import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import type { AnalyticsSummary } from '@shinju-date/dashboard-stats'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getRedisClient } from '@/lib/redis'
import { getAnalyticsSummary } from './get-analytics-summary'

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
}))
vi.mock('@shinju-date/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}))
vi.mock('@/lib/redis', () => ({
  getRedisClient: vi.fn(),
}))

interface FakeRedisData {
  /** The clicks of today, by video */
  clicks?: Record<string, number>
  /** The number of the keywords of the all-time ranking */
  popularKeywords?: number
  /** The searches of today */
  searches?: number
  /** The snapshots of the days (`YYYYMMDD`) */
  snapshots?: Record<string, AnalyticsSummary>
}

/** Keep what the analytics read in Redis. Today is 2025-11-13. */
function mockRedis({
  clicks = {},
  popularKeywords = 0,
  searches,
  snapshots = {},
}: FakeRedisData = {}) {
  const values: Record<string, unknown> = {
    [`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20251113`]: searches,
    ...Object.fromEntries(
      Object.entries(snapshots).map(([dateKey, snapshot]) => [
        `${REDIS_KEYS.SUMMARY_ANALYTICS_PREFIX}${dateKey}`,
        snapshot,
      ]),
    ),
  }
  const redisClient = {
    get: vi.fn(async (key: string) => values[key] ?? null),
    zcard: vi.fn(async (key: string) =>
      key === REDIS_KEYS.SEARCH_POPULAR_ALL_TIME ? popularKeywords : 0,
    ),
    zrange: vi.fn(async (key: string) =>
      key === `${REDIS_KEYS.CLICK_VIDEO_PREFIX}20251113`
        ? Object.entries(clicks).flat()
        : [],
    ),
  }

  vi.mocked(getRedisClient).mockReturnValue(redisClient as never)

  return redisClient
}

describe('getAnalyticsSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 2025-11-13 09:00 in JST
    vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockReturnValue(
      Temporal.Instant.from('2025-11-13T00:00:00Z').toZonedDateTimeISO(
        TIME_ZONE,
      ),
    )
  })

  it('should count the keywords of the all-time popular searches', async () => {
    const { zcard } = mockRedis({ popularKeywords: 12 })

    const result = await getAnalyticsSummary()

    expect(zcard).toHaveBeenCalledWith(REDIS_KEYS.SEARCH_POPULAR_ALL_TIME)
    expect(result.totalPopularKeywords.current).toBe(12)
  })

  it('adds the changes from the snapshots of the day before and the week before', async () => {
    mockRedis({
      clicks: { 'video-1': 4, 'video-2': 3 },
      popularKeywords: 12,
      searches: 30,
      snapshots: {
        '20251106': {
          recentClicks: 10,
          recentSearches: 20,
          totalPopularKeywords: 8,
        },
        '20251112': {
          recentClicks: 5,
          recentSearches: 45,
          totalPopularKeywords: 12,
        },
      },
    })

    await expect(getAnalyticsSummary()).resolves.toEqual({
      recentClicks: { current: 7, dayChange: 2, weekChange: -3 },
      recentSearches: { current: 30, dayChange: -15, weekChange: 10 },
      totalPopularKeywords: { current: 12, dayChange: 0, weekChange: 4 },
    })
  })

  it('has no changes on a day without the snapshots to compare with', async () => {
    mockRedis({ searches: 30 })

    await expect(getAnalyticsSummary()).resolves.toEqual({
      recentClicks: { current: 0, dayChange: null, weekChange: null },
      recentSearches: { current: 30, dayChange: null, weekChange: null },
      totalPopularKeywords: { current: 0, dayChange: null, weekChange: null },
    })
  })

  it('shows zeros without changes when Redis cannot be read', async () => {
    const redisClient = mockRedis()

    redisClient.get.mockRejectedValue(new Error('connection refused'))

    await expect(getAnalyticsSummary()).resolves.toEqual({
      recentClicks: { current: 0, dayChange: null, weekChange: null },
      recentSearches: { current: 0, dayChange: null, weekChange: null },
      totalPopularKeywords: { current: 0, dayChange: null, weekChange: null },
    })
  })
})
