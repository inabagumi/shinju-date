import { TIME_ZONE } from '@shinju-date/constants'
import type {
  AnalyticsSummary,
  SummaryStats,
} from '@shinju-date/dashboard-stats'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSupabaseClient = {
  from: vi.fn(),
}

const mockRedisClient = {
  set: vi.fn(),
}

const acquireLock = vi.fn()
const releaseLock = vi.fn()

const mockCountSummaryStats = vi.fn()
const mockCollectAnalyticsSummary = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabaseClient: mockSupabaseClient,
}))

vi.mock('@/lib/redis', () => ({
  redisClient: mockRedisClient,
}))

vi.mock('@/lib/lock', () => ({ acquireLock, releaseLock }))

// The counts and the analytics are tested in `@shinju-date/dashboard-stats`.
// The snapshots are written by the real functions of the package, so that the
// keys and the values saved to Redis are checked here.
vi.mock('@shinju-date/dashboard-stats', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shinju-date/dashboard-stats')>()),
  collectAnalyticsSummary: mockCollectAnalyticsSummary,
  countSummaryStats: mockCountSummaryStats,
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
    fn()
  }),
}))

const summaryStats: SummaryStats = {
  deletedVideos: 10,
  hiddenVideos: 20,
  scheduledVideos: 5,
  totalTalents: 25,
  totalTerms: 50,
  totalVideos: 100,
  visibleVideos: 80,
}

const analyticsSummary: AnalyticsSummary = {
  recentClicks: 30,
  recentSearches: 150,
  totalPopularKeywords: 25,
}

const SNAPSHOT_TTL_SECONDS = 30 * 24 * 60 * 60

/** Run the route as if it is `instant` now. */
async function runAt(instant: string): Promise<Response> {
  vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockImplementation(
    (timeZone = TIME_ZONE) =>
      Temporal.Instant.from(instant).toZonedDateTimeISO(timeZone),
  )

  const { POST } = await import('../route')

  return POST(
    new Request('http://localhost:3000/stats/snapshot', {
      method: 'POST',
    }),
  )
}

describe('stats/snapshot route', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    acquireLock.mockResolvedValue('lock-value')
    mockRedisClient.set.mockResolvedValue('OK')
    mockCountSummaryStats.mockResolvedValue(summaryStats)
    mockCollectAnalyticsSummary.mockResolvedValue(analyticsSummary)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('target day', () => {
    it('counts the previous day in Japan as of its end', async () => {
      // 2025-11-13 00:05 JST
      await runAt('2025-11-12T15:05:00Z')

      expect(mockCountSummaryStats).toHaveBeenCalledWith(mockSupabaseClient, {
        asOf: Temporal.Instant.from('2025-11-12T15:00:00Z'),
      })
      expect(mockCollectAnalyticsSummary).toHaveBeenCalledWith(
        mockRedisClient,
        '20251112',
      )
    })

    it('uses the day in Japan even when the day in UTC is different', async () => {
      // 2025-11-13 23:30 JST, which is still 2025-11-13 in UTC
      await runAt('2025-11-13T14:30:00Z')

      expect(mockCountSummaryStats).toHaveBeenCalledWith(mockSupabaseClient, {
        asOf: Temporal.Instant.from('2025-11-12T15:00:00Z'),
      })
      expect(mockCollectAnalyticsSummary).toHaveBeenCalledWith(
        mockRedisClient,
        '20251112',
      )
    })
  })

  describe('snapshots', () => {
    it('saves the counts and the analytics under the keys of the day', async () => {
      await runAt('2025-11-12T15:05:00Z')

      expect(mockRedisClient.set).toHaveBeenCalledTimes(2)
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'summary:stats:20251112',
        summaryStats,
        { ex: SNAPSHOT_TTL_SECONDS },
      )
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'summary:analytics:20251112',
        analyticsSummary,
        { ex: SNAPSHOT_TTL_SECONDS },
      )
    })
  })

  describe('reporting', () => {
    it('responds with 204 and reports the run as ok', async () => {
      const Sentry = await import('@sentry/nextjs')

      const response = await runAt('2025-11-12T15:05:00Z')

      expect(response.status).toBe(204)
      expect(acquireLock).toHaveBeenCalledWith('stats:snapshot', 70)
      expect(releaseLock).toHaveBeenCalledWith('stats:snapshot', 'lock-value')
      expect(Sentry.captureCheckIn).toHaveBeenLastCalledWith({
        checkInId: 'mock-check-in-id',
        monitorSlug: '/stats/snapshot',
        status: 'ok',
      })
    })

    it('responds with 500 and reports the error when the snapshot fails', async () => {
      const Sentry = await import('@sentry/nextjs')
      const error = new Error('Database error')

      mockCountSummaryStats.mockRejectedValue(error)

      const response = await runAt('2025-11-12T15:05:00Z')

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
