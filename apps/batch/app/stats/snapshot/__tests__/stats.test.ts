import { REDIS_KEYS } from '@shinju-date/constants'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAnalyticsSummary, getSummaryStats } from '../stats'

describe('getSummaryStats', () => {
  let mockSupabaseClient: {
    from: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Create mock Supabase client with chainable query builder
    const createMockQuery = (
      count: number,
      error: { message: string } | null = null,
    ) => ({
      count,
      data: null,
      eq: vi.fn().mockReturnThis(),
      error,
      from: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ count, error }),
      select: vi.fn().mockReturnThis(),
    })

    mockSupabaseClient = {
      from: vi.fn((table: string) => {
        // Return different counts based on the table and query
        const query = createMockQuery(100)

        // Override specific methods to track calls
        query.select = vi.fn().mockReturnValue(query)
        query.eq = vi.fn().mockReturnValue(query)
        query.in = vi.fn().mockReturnValue(query)
        query.is = vi.fn().mockReturnValue(query)
        query.lt = vi.fn().mockReturnValue(query)
        query.not = vi.fn().mockReturnValue(query)

        // Set up different responses based on query chain
        if (table === 'videos') {
          query.or = vi.fn().mockResolvedValue({ count: 100, error: null })
        } else if (table === 'terms') {
          query.select = vi.fn().mockResolvedValue({ count: 50, error: null })
        } else if (table === 'talents') {
          query.or = vi.fn().mockResolvedValue({ count: 25, error: null })
        }

        return query
      }),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return summary stats with correct structure', async () => {
    const targetDayEnd = '2025-11-13T00:00:00Z'

    const result = await getSummaryStats(mockSupabaseClient, targetDayEnd)

    expect(result).toHaveProperty('totalVideos')
    expect(result).toHaveProperty('visibleVideos')
    expect(result).toHaveProperty('scheduledVideos')
    expect(result).toHaveProperty('hiddenVideos')
    expect(result).toHaveProperty('deletedVideos')
    expect(result).toHaveProperty('totalTerms')
    expect(result).toHaveProperty('totalTalents')
  })

  it('should query videos table with correct filters for total count', async () => {
    const targetDayEnd = '2025-11-13T00:00:00Z'

    await getSummaryStats(mockSupabaseClient, targetDayEnd)

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('videos')
    const videosQuery = mockSupabaseClient.from.mock.results[0].value
    expect(videosQuery.select).toHaveBeenCalledWith('*', {
      count: 'exact',
      head: true,
    })
    expect(videosQuery.lt).toHaveBeenCalledWith('created_at', targetDayEnd)
    expect(videosQuery.or).toHaveBeenCalledWith(
      `deleted_at.is.null,deleted_at.gte.${targetDayEnd}`,
    )
  })

  it('should query videos table for visible videos (public)', async () => {
    const targetDayEnd = '2025-11-13T00:00:00Z'

    await getSummaryStats(mockSupabaseClient, targetDayEnd)

    const visibleQuery = mockSupabaseClient.from.mock.results[1].value
    expect(visibleQuery.eq).toHaveBeenCalledWith('visible', true)
    expect(visibleQuery.in).toHaveBeenCalledWith('status', ['ENDED', 'LIVE'])
    expect(visibleQuery.lt).toHaveBeenCalledWith('created_at', targetDayEnd)
    expect(visibleQuery.or).toHaveBeenCalledWith(
      `deleted_at.is.null,deleted_at.gte.${targetDayEnd}`,
    )
  })

  it('should query videos table for hidden videos', async () => {
    const targetDayEnd = '2025-11-13T00:00:00Z'

    await getSummaryStats(mockSupabaseClient, targetDayEnd)

    const hiddenQuery = mockSupabaseClient.from.mock.results[2].value
    expect(hiddenQuery.eq).toHaveBeenCalledWith('visible', false)
    expect(hiddenQuery.lt).toHaveBeenCalledWith('created_at', targetDayEnd)
    expect(hiddenQuery.or).toHaveBeenCalledWith(
      `deleted_at.is.null,deleted_at.gte.${targetDayEnd}`,
    )
  })

  it('should query videos table for scheduled videos', async () => {
    const targetDayEnd = '2025-11-13T00:00:00Z'

    await getSummaryStats(mockSupabaseClient, targetDayEnd)

    const scheduledQuery = mockSupabaseClient.from.mock.results[3].value
    expect(scheduledQuery.eq).toHaveBeenCalledWith('visible', true)
    expect(scheduledQuery.eq).toHaveBeenCalledWith('status', 'UPCOMING')
    expect(scheduledQuery.lt).toHaveBeenCalledWith('created_at', targetDayEnd)
    expect(scheduledQuery.or).toHaveBeenCalledWith(
      `deleted_at.is.null,deleted_at.gte.${targetDayEnd}`,
    )
  })

  it('should query videos table for deleted videos', async () => {
    const targetDayEnd = '2025-11-13T00:00:00Z'

    await getSummaryStats(mockSupabaseClient, targetDayEnd)

    // Deleted videos query is now the 5th query (after totalVideos, visibleVideos, hiddenVideos, scheduledVideos)
    const deletedQuery = mockSupabaseClient.from.mock.results[4].value
    expect(deletedQuery.not).toHaveBeenCalledWith('deleted_at', 'is', null)
    expect(deletedQuery.lt).toHaveBeenCalledWith('deleted_at', targetDayEnd)
  })

  it('should query terms table', async () => {
    const targetDayEnd = '2025-11-13T00:00:00Z'

    await getSummaryStats(mockSupabaseClient, targetDayEnd)

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('terms')
  })

  it('should query talents table with date filters', async () => {
    const targetDayEnd = '2025-11-13T00:00:00Z'

    await getSummaryStats(mockSupabaseClient, targetDayEnd)

    // Talents query is now the 7th query (after totalVideos, visibleVideos, hiddenVideos, scheduledVideos, deletedVideos, terms)
    const talentsQuery = mockSupabaseClient.from.mock.results[6].value
    expect(talentsQuery.lt).toHaveBeenCalledWith('created_at', targetDayEnd)
    expect(talentsQuery.or).toHaveBeenCalledWith(
      `deleted_at.is.null,deleted_at.gte.${targetDayEnd}`,
    )
  })

  it('should handle null counts gracefully', async () => {
    mockSupabaseClient.from = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ count: null, error: null }),
      select: vi.fn().mockReturnThis(),
    })

    const result = await getSummaryStats(
      mockSupabaseClient,
      '2025-11-13T00:00:00Z',
    )

    expect(result.totalVideos).toBe(0)
    expect(result.visibleVideos).toBe(0)
    expect(result.scheduledVideos).toBe(0)
    expect(result.scheduledVideos).toBe(0)
    expect(result.hiddenVideos).toBe(0)
    expect(result.deletedVideos).toBe(0)
    expect(result.totalTerms).toBe(0)
    expect(result.totalTalents).toBe(0)
  })

  it('should throw TypeError when totalVideos query fails', async () => {
    mockSupabaseClient.from = vi.fn().mockReturnValue({
      lt: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({
        count: null,
        error: { message: 'Database error' },
      }),
      select: vi.fn().mockReturnThis(),
    })

    await expect(
      getSummaryStats(mockSupabaseClient, '2025-11-13T00:00:00Z'),
    ).rejects.toThrow(TypeError)
    await expect(
      getSummaryStats(mockSupabaseClient, '2025-11-13T00:00:00Z'),
    ).rejects.toThrow('Database error')
  })

  it('should throw TypeError when visibleVideos query fails', async () => {
    let callCount = 0
    mockSupabaseClient.from = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      or: vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          return { count: 100, error: null }
        }
        return { count: null, error: { message: 'Visible query error' } }
      }),
      select: vi.fn().mockReturnThis(),
    })

    await expect(
      getSummaryStats(mockSupabaseClient, '2025-11-13T00:00:00Z'),
    ).rejects.toThrow('Visible query error')
  })
})

describe('getAnalyticsSummary', () => {
  let mockRedisClient: {
    get: ReturnType<typeof vi.fn>
    zcard: ReturnType<typeof vi.fn>
    zrange: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockRedisClient = {
      get: vi.fn(),
      zcard: vi.fn(),
      zrange: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return analytics summary with correct structure', async () => {
    mockRedisClient.get.mockResolvedValue(150)
    mockRedisClient.zcard.mockResolvedValue(25)
    mockRedisClient.zrange.mockResolvedValue(['video1', '10', 'video2', '20'])

    const result = await getAnalyticsSummary(mockRedisClient, '20251113')

    expect(result).toHaveProperty('recentSearches')
    expect(result).toHaveProperty('totalPopularKeywords')
    expect(result).toHaveProperty('recentClicks')
  })

  it('should query Redis with correct keys', async () => {
    mockRedisClient.get.mockResolvedValue(150)
    mockRedisClient.zcard.mockResolvedValue(25)
    mockRedisClient.zrange.mockResolvedValue([])

    const dateKey = '20251113'
    await getAnalyticsSummary(mockRedisClient, dateKey)

    expect(mockRedisClient.get).toHaveBeenCalledWith(
      `${REDIS_KEYS.SEARCH_VOLUME_PREFIX}${dateKey}`,
    )
    expect(mockRedisClient.zcard).toHaveBeenCalledWith(
      REDIS_KEYS.SEARCH_POPULAR,
    )
    expect(mockRedisClient.zrange).toHaveBeenCalledWith(
      `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${dateKey}`,
      0,
      -1,
      { rev: false, withScores: true },
    )
  })

  it('should calculate total clicks correctly', async () => {
    mockRedisClient.get.mockResolvedValue(150)
    mockRedisClient.zcard.mockResolvedValue(25)
    mockRedisClient.zrange.mockResolvedValue([
      'video1',
      '10',
      'video2',
      '20',
      'video3',
      '15',
    ])

    const result = await getAnalyticsSummary(mockRedisClient, '20251113')

    expect(result.recentClicks).toBe(45) // 10 + 20 + 15
  })

  it('should handle empty click results', async () => {
    mockRedisClient.get.mockResolvedValue(150)
    mockRedisClient.zcard.mockResolvedValue(25)
    mockRedisClient.zrange.mockResolvedValue([])

    const result = await getAnalyticsSummary(mockRedisClient, '20251113')

    expect(result.recentClicks).toBe(0)
  })

  it('should handle null search volume', async () => {
    mockRedisClient.get.mockResolvedValue(null)
    mockRedisClient.zcard.mockResolvedValue(25)
    mockRedisClient.zrange.mockResolvedValue([])

    const result = await getAnalyticsSummary(mockRedisClient, '20251113')

    expect(result.recentSearches).toBe(0)
  })

  it('should handle null popular keywords count', async () => {
    mockRedisClient.get.mockResolvedValue(150)
    mockRedisClient.zcard.mockResolvedValue(null)
    mockRedisClient.zrange.mockResolvedValue([])

    const result = await getAnalyticsSummary(mockRedisClient, '20251113')

    expect(result.totalPopularKeywords).toBe(0)
  })

  it('should parse click scores as integers', async () => {
    mockRedisClient.get.mockResolvedValue(100)
    mockRedisClient.zcard.mockResolvedValue(20)
    mockRedisClient.zrange.mockResolvedValue([
      'video1',
      '5',
      'video2',
      '10',
      'video3',
      '7',
    ])

    const result = await getAnalyticsSummary(mockRedisClient, '20251113')

    expect(result.recentClicks).toBe(22)
    expect(Number.isInteger(result.recentClicks)).toBe(true)
  })

  it('should skip undefined click scores', async () => {
    mockRedisClient.get.mockResolvedValue(100)
    mockRedisClient.zcard.mockResolvedValue(20)
    mockRedisClient.zrange.mockResolvedValue([
      'video1',
      '10',
      'video2',
      undefined,
      'video3',
      '5',
    ])

    const result = await getAnalyticsSummary(mockRedisClient, '20251113')

    expect(result.recentClicks).toBe(15) // 10 + 5, skip undefined
  })
})
