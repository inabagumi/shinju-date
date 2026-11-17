import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import type { SummaryStats } from '@shinju-date/dashboard-stats'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getRedisClient } from '@/lib/redis'
import { getHistoricalStats } from './get-historical-stats'

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
}))
vi.mock('@/lib/redis', () => ({
  getRedisClient: vi.fn(),
}))

function snapshot(totalVideos: number): SummaryStats {
  return {
    deletedVideos: 2,
    hiddenVideos: 1,
    scheduledVideos: 5,
    totalTalents: 12,
    totalTerms: 40,
    totalVideos,
    visibleVideos: totalVideos - 6,
  }
}

/** Keep the snapshots of the given days (`YYYYMMDD`) in Redis. */
function mockSnapshots(snapshots: Record<string, unknown>) {
  const get = vi.fn(
    async (key: string) =>
      snapshots[key.slice(REDIS_KEYS.SUMMARY_STATS_PREFIX.length)] ?? null,
  )

  vi.mocked(getRedisClient).mockReturnValue({ get } as never)

  return get
}

describe('getHistoricalStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 2025-11-13 09:00 in JST
    vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockReturnValue(
      Temporal.Instant.from('2025-11-13T00:00:00Z').toZonedDateTimeISO(
        TIME_ZONE,
      ),
    )
  })

  it('reads the snapshots of the days up to today, from the oldest', async () => {
    const get = mockSnapshots({
      '20251110': snapshot(28),
      '20251111': snapshot(29),
      '20251112': snapshot(31),
    })

    const result = await getHistoricalStats(3)

    expect(get.mock.calls.map(([key]) => key)).toEqual([
      `${REDIS_KEYS.SUMMARY_STATS_PREFIX}20251111`,
      `${REDIS_KEYS.SUMMARY_STATS_PREFIX}20251112`,
      `${REDIS_KEYS.SUMMARY_STATS_PREFIX}20251113`,
    ])
    expect(result).toEqual([
      { date: '11/11', ...snapshot(29) },
      { date: '11/12', ...snapshot(31) },
    ])
  })

  it('leaves out the days whose snapshot is not in the form of the counts', async () => {
    const { scheduledVideos: _, ...oldForm } = snapshot(20)

    mockSnapshots({
      '20251107': oldForm,
      '20251108': 'broken',
      '20251112': snapshot(31),
    })

    await expect(getHistoricalStats()).resolves.toEqual([
      { date: '11/12', ...snapshot(31) },
    ])
  })

  it('returns nothing while there is no snapshot', async () => {
    mockSnapshots({})

    await expect(getHistoricalStats()).resolves.toEqual([])
  })
})
