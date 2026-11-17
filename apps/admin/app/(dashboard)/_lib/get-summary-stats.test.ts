import { REDIS_KEYS } from '@shinju-date/constants'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getRedisClient } from '@/lib/redis'
import { createSupabaseServerClient } from '@/lib/supabase'
import { getSummaryStats, type SummaryStats } from './get-summary-stats'

vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/redis', () => ({
  getRedisClient: vi.fn(),
}))

interface VideoRow {
  deleted_at: string | null
  status: 'ENDED' | 'LIVE' | 'PUBLISHED' | 'UPCOMING'
  visible: boolean
}

type Row = Record<string, unknown>
type Filter = (row: Row) => boolean

/**
 * A Supabase client that counts the rows of in-memory tables with the filters
 * `getSummaryStats` uses, so that the tests check the counts themselves
 */
function createTableClient(tables: Record<string, readonly object[]>) {
  return {
    from(table: string) {
      const filters: Filter[] = []
      const builder = {
        eq(column: string, value: unknown) {
          filters.push((row) => row[column] === value)
          return builder
        },
        in(column: string, values: unknown[]) {
          filters.push((row) => values.includes(row[column]))
          return builder
        },
        is(column: string, value: null) {
          filters.push((row) => row[column] === value)
          return builder
        },
        not(column: string, operator: string, value: unknown) {
          if (operator !== 'is' || value !== null) {
            throw new Error(`Unsupported not(): ${operator}`)
          }
          filters.push((row) => row[column] !== null)
          return builder
        },
        select() {
          return builder
        },
        // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are thenable
        then(resolve: (result: { count: number; error: null }) => unknown) {
          const rows = (tables[table] ?? []) as Row[]
          const count = rows.filter((row) =>
            filters.every((filter) => filter(row)),
          ).length
          return Promise.resolve({ count, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
}

function video(
  status: VideoRow['status'],
  overrides: Partial<VideoRow> = {},
): VideoRow {
  return { deleted_at: null, status, visible: true, ...overrides }
}

const videos: VideoRow[] = [
  video('PUBLISHED'),
  video('PUBLISHED'),
  video('PUBLISHED'),
  video('LIVE'),
  video('ENDED'),
  video('ENDED'),
  video('UPCOMING'),
  // Not public: hidden or deleted
  video('PUBLISHED', { visible: false }),
  video('ENDED', { deleted_at: '2025-11-10T00:00:00Z' }),
]

describe('getSummaryStats', () => {
  beforeEach(() => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      createTableClient({
        talents: [],
        terms: [],
        videos: videos,
      }) as never,
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should count visible PUBLISHED videos as public', async () => {
    vi.mocked(getRedisClient).mockReturnValue({
      get: vi.fn().mockResolvedValue(null),
    } as never)

    const result = await getSummaryStats()

    // 3 PUBLISHED + 1 LIVE + 2 ENDED
    expect(result.visibleVideos.current).toBe(6)
    expect(result.scheduledVideos.current).toBe(1)
    expect(result.hiddenVideos.current).toBe(1)
    expect(result.deletedVideos.current).toBe(1)
    expect(result.totalVideos.current).toBe(8)
  })

  it('should show no change against a snapshot of the same videos', async () => {
    // The daily snapshot of batch, saved from the same videos
    const snapshot: SummaryStats = {
      deletedVideos: 1,
      hiddenVideos: 1,
      scheduledVideos: 1,
      totalTalents: 0,
      totalTerms: 0,
      totalVideos: 8,
      visibleVideos: 6,
    }
    const get = vi.fn().mockResolvedValue(snapshot)
    vi.mocked(getRedisClient).mockReturnValue({ get } as never)

    const result = await getSummaryStats()

    expect(get).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${REDIS_KEYS.SUMMARY_STATS_PREFIX}`)),
    )
    expect(result.visibleVideos).toEqual({
      current: 6,
      dayChange: 0,
      weekChange: 0,
    })
  })
})
