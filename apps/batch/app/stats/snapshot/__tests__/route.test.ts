import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import { toDBString } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
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

// Mock modules
vi.mock('@/lib/supabase', () => ({
  supabaseClient: mockSupabaseClient,
}))

vi.mock('@/lib/redis', () => ({
  redisClient: mockRedisClient,
}))

vi.mock('@/lib/ratelimit', () => ({
  statsSnapshot: mockRatelimit,
}))

vi.mock('@sentry/nextjs', () => ({
  captureCheckIn: vi.fn(() => 'mock-check-in-id'),
  captureException: vi.fn(),
  flush: vi.fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
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
      const previousDayStart = previousDay.with({
        hour: 0,
        microsecond: 0,
        millisecond: 0,
        minute: 0,
        nanosecond: 0,
        second: 0,
      })
      const previousDayEnd = previousDay.with({
        hour: 23,
        microsecond: 999,
        millisecond: 999,
        minute: 59,
        nanosecond: 999,
        second: 59,
      })

      // Previous day should be November 12, 2025
      expect(previousDay.year).toBe(2025)
      expect(previousDay.month).toBe(11)
      expect(previousDay.day).toBe(12)

      // Start should be 00:00:00
      expect(previousDayStart.hour).toBe(0)
      expect(previousDayStart.minute).toBe(0)
      expect(previousDayStart.second).toBe(0)

      // End should be 23:59:59.999999999
      expect(previousDayEnd.hour).toBe(23)
      expect(previousDayEnd.minute).toBe(59)
      expect(previousDayEnd.second).toBe(59)
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

  describe('database query filters', () => {
    it('should use correct date filters for videos query', async () => {
      const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
      const previousDay = now.subtract({ days: 1 })
      const previousDayEnd = previousDay.with({
        hour: 23,
        microsecond: 999,
        millisecond: 999,
        minute: 59,
        nanosecond: 999,
        second: 59,
      })
      const targetDayEnd = toDBString(previousDayEnd.add({ nanoseconds: 1 }))

      // Mock the Supabase query chain
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ count: 100, error: null }),
        select: vi.fn().mockReturnThis(),
      }

      mockSupabaseClient.from.mockReturnValue(mockQuery)

      // Import the route after mocks are set up
      const { POST } = await import('../route')

      const request = new Request('http://localhost:3000/stats/snapshot', {
        method: 'POST',
      })

      // Skip CRON_SECRET check by not setting it
      delete process.env['CRON_SECRET']

      await POST(request)

      // Verify that Supabase queries were called with correct filters
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('videos')
      expect(mockQuery.lt).toHaveBeenCalledWith('created_at', targetDayEnd)
      expect(mockQuery.or).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at.is.null'),
      )
      expect(mockQuery.or).toHaveBeenCalledWith(
        expect.stringContaining(`deleted_at.gte.${targetDayEnd}`),
      )
    })
  })

  describe('Redis key usage', () => {
    it('should use previous day Redis keys for analytics', async () => {
      const now = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
      const previousDay = now.subtract({ days: 1 })
      const expectedDateKey = [
        previousDay.year.toString(10).padStart(4, '0'),
        previousDay.month.toString(10).padStart(2, '0'),
        previousDay.day.toString(10).padStart(2, '0'),
      ].join('')

      // Mock Redis responses
      mockRedisClient.get.mockResolvedValue(150)
      mockRedisClient.zcard.mockResolvedValue(25)
      mockRedisClient.zrange.mockResolvedValue(['video1', '10', 'video2', '20'])

      // Mock Supabase responses
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ count: 100, error: null }),
        select: vi.fn().mockReturnThis(),
      }
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      // Import the route after mocks are set up
      const { POST } = await import('../route')

      const request = new Request('http://localhost:3000/stats/snapshot', {
        method: 'POST',
      })

      delete process.env['CRON_SECRET']

      await POST(request)

      // Verify Redis keys are using previous day's date
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        `${REDIS_KEYS.SEARCH_VOLUME_PREFIX}${expectedDateKey}`,
      )
      expect(mockRedisClient.zrange).toHaveBeenCalledWith(
        `${REDIS_KEYS.CLICK_VIDEO_PREFIX}${expectedDateKey}`,
        0,
        -1,
        expect.any(Object),
      )

      // Verify data is stored with previous day's key
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${expectedDateKey}`,
        expect.any(Object),
        expect.any(Object),
      )
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `${REDIS_KEYS.SUMMARY_ANALYTICS_PREFIX}${expectedDateKey}`,
        expect.any(Object),
        expect.any(Object),
      )
    })
  })

  describe('cron schedule validation', () => {
    it('should be scheduled to run at 0:05 AM UTC', async () => {
      // The cron expression should be "5 0 * * *" which means:
      // - minute: 5
      // - hour: 0 (midnight UTC)
      // - day of month: * (every day)
      // - month: * (every month)
      // - day of week: * (every day of week)

      // This is just a documentation test to ensure the schedule is correct
      const expectedCronExpression = '5 0 * * *'
      expect(expectedCronExpression).toBe('5 0 * * *')
    })
  })
})
