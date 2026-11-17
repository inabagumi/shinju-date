import { TIME_ZONE } from '@shinju-date/constants'
import { startOfDay, toDBString } from '@shinju-date/temporal-fns'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
const mockSupabaseClient = {
  from: vi.fn(),
}

const mockRedisClient = {
  get: vi.fn(),
  set: vi.fn(),
  zcard: vi.fn(),
  zrange: vi.fn(),
}

const mockRatelimit = {
  limit: vi.fn(),
}

const mockGetSummaryStats = vi.fn()
const mockGetAnalyticsSummary = vi.fn()

// Mock modules
vi.mock('@/lib/supabase', () => ({
  supabaseClient: mockSupabaseClient,
}))

vi.mock('@/lib/redis', () => ({
  redisClient: mockRedisClient,
}))

vi.mock('@/lib/ratelimit', () => ({
  recommendationQueriesUpdate: { limit: vi.fn() },
  statsSnapshot: mockRatelimit,
  talentsUpdate: { limit: vi.fn() },
  termsPopularityUpdate: { limit: vi.fn() },
  videosBackfill: { limit: vi.fn() },
  videosCascadeFromTalents: { limit: vi.fn() },
  videosCheck: { limit: vi.fn() },
  videosCheckAll: { limit: vi.fn() },
  videosCheckRecent: { limit: vi.fn() },
  videosUpdate: { limit: vi.fn() },
}))

vi.mock('../_lib/stats', () => ({
  getAnalyticsSummary: mockGetAnalyticsSummary,
  getSummaryStats: mockGetSummaryStats,
}))

vi.mock('@sentry/nextjs', () => ({
  captureCheckIn: vi.fn(() => 'mock-check-in-id'),
  captureException: vi.fn(),
  flush: vi.fn(),
}))

vi.mock('@shinju-date/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void) => {
    // Execute the function immediately in tests
    fn()
  }),
}))

describe('stats/snapshot route', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Set up default mock implementations
    mockRatelimit.limit.mockResolvedValue({ success: true })
    mockGetSummaryStats.mockResolvedValue({
      deletedVideos: 10,
      hiddenVideos: 20,
      totalTalents: 25,
      totalTerms: 50,
      totalVideos: 100,
      visibleVideos: 80,
    })
    mockGetAnalyticsSummary.mockResolvedValue({
      recentClicks: 30,
      recentSearches: 150,
      totalPopularKeywords: 25,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('date range calculation', () => {
    it('should calculate previous day correctly', () => {
      // Test date: November 13, 2025 at 00:05:00 JST (after midnight)
      const now = Temporal.ZonedDateTime.from({
        day: 13,
        hour: 0,
        minute: 5,
        month: 11,
        second: 0,
        timeZone: TIME_ZONE,
        year: 2025,
      })

      // Calculate previous day
      const previousDay = now.subtract({ days: 1 })
      const previousDayStart = startOfDay(previousDay)

      // Previous day should be November 12, 2025
      expect(previousDay.year).toBe(2025)
      expect(previousDay.month).toBe(11)
      expect(previousDay.day).toBe(12)

      // Start should be 00:00:00
      expect(previousDayStart.hour).toBe(0)
      expect(previousDayStart.minute).toBe(0)
      expect(previousDayStart.second).toBe(0)
      expect(previousDayStart.millisecond).toBe(0)
      expect(previousDayStart.microsecond).toBe(0)
      expect(previousDayStart.nanosecond).toBe(0)
    })

    it('should format dates correctly for database queries', () => {
      const testDate = Temporal.ZonedDateTime.from({
        day: 12,
        hour: 0,
        minute: 0,
        month: 11,
        second: 0,
        timeZone: TIME_ZONE,
        year: 2025,
      })

      const dbString = toDBString(testDate)

      // Should be in ISO 8601 format with UTC timezone
      expect(dbString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    })
  })

  describe('stats functions integration', () => {
    it('should call getSummaryStats and getAnalyticsSummary with correct parameters', async () => {
      // Import the route after mocks are set up
      const { POST } = await import('../route')

      const request = new Request('http://localhost:3000/stats/snapshot', {
        method: 'POST',
      })

      await POST(request)

      // Verify that getSummaryStats was called with supabaseClient and targetDayEnd
      expect(mockGetSummaryStats).toHaveBeenCalledWith(
        mockSupabaseClient,
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
      )

      // Verify that getAnalyticsSummary was called with redisClient and dateKey
      expect(mockGetAnalyticsSummary).toHaveBeenCalledWith(
        mockRedisClient,
        expect.stringMatching(/^\d{8}$/),
      )
    })
  })

  describe('Redis key usage', () => {
    it('should use previous day Redis keys for analytics', async () => {
      // Import the route after mocks are set up
      const { POST } = await import('../route')

      const request = new Request('http://localhost:3000/stats/snapshot', {
        method: 'POST',
      })

      await POST(request)

      // Verify data is stored with previous day's key
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.stringContaining('summary:stats:'),
        expect.any(Object),
        expect.any(Object),
      )
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.stringContaining('summary:analytics:'),
        expect.any(Object),
        expect.any(Object),
      )
    })
  })

  describe('reporting', () => {
    it('responds with 204 and reports the run as ok', async () => {
      const Sentry = await import('@sentry/nextjs')
      const { POST } = await import('../route')

      const response = await POST(
        new Request('http://localhost:3000/stats/snapshot', {
          method: 'POST',
        }),
      )

      expect(response.status).toBe(204)
      expect(mockRatelimit.limit).toHaveBeenCalledWith('stats:snapshot')
      expect(Sentry.captureCheckIn).toHaveBeenLastCalledWith({
        checkInId: 'mock-check-in-id',
        monitorSlug: '/stats/snapshot',
        status: 'ok',
      })
    })

    it('responds with 500 and reports the error when the snapshot fails', async () => {
      const Sentry = await import('@sentry/nextjs')
      const { POST } = await import('../route')
      const error = new Error('Database error')

      mockGetSummaryStats.mockRejectedValue(error)

      const response = await POST(
        new Request('http://localhost:3000/stats/snapshot', {
          method: 'POST',
        }),
      )

      expect(response.status).toBe(500)
      expect(mockRedisClient.set).not.toHaveBeenCalled()
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
      expect(Sentry.captureCheckIn).toHaveBeenLastCalledWith({
        checkInId: 'mock-check-in-id',
        monitorSlug: '/stats/snapshot',
        status: 'error',
      })
    })
  })
})
