import { REDIS_KEYS } from '@shinju-date/constants'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { logSearchQuery } from './search-analytics'

const multi = {
  exec: vi.fn(),
  expire: vi.fn(),
  incr: vi.fn(),
  sadd: vi.fn(),
  zincrby: vi.fn(),
}

vi.mock('./redis', () => ({
  getRedisClient: () => ({ multi: () => multi }),
}))

vi.mock('./session-analytics', () => ({
  trackSearchSession: vi.fn(),
}))

const DAY_SECONDS = 24 * 60 * 60

describe('logSearchQuery', () => {
  beforeEach(() => {
    // 2025-10-14T12:00:00+09:00 (Tuesday in Asia/Tokyo)
    vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockImplementation((timeZone) =>
      Temporal.Instant.from('2025-10-14T03:00:00Z').toZonedDateTimeISO(
        timeZone ?? 'UTC',
      ),
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  test('counts the normalized query for the day, the week and the whole period', async () => {
    await logSearchQuery('  Singing 歌枠 ', 3)

    expect(multi.zincrby.mock.calls).toEqual([
      [`${REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX}20251014`, 1, 'singing 歌枠'],
      [`${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}20251013`, 1, 'singing 歌枠'],
      [REDIS_KEYS.SEARCH_POPULAR_ALL_TIME, 1, 'singing 歌枠'],
    ])
    expect(multi.exec).toHaveBeenCalledOnce()
  })

  test('increments the daily search volume', async () => {
    await logSearchQuery('歌枠', 3)

    expect(multi.incr.mock.calls).toEqual([
      [`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20251014`],
    ])
  })

  test('sets a TTL on every daily and weekly key, and on no other key', async () => {
    await logSearchQuery('歌枠', 0)

    expect(multi.expire.mock.calls).toHaveLength(3)
    expect(multi.expire.mock.calls).toEqual(
      expect.arrayContaining([
        [`${REDIS_KEYS.SEARCH_POPULAR_DAILY_PREFIX}20251014`, 90 * DAY_SECONDS],
        [
          `${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}20251013`,
          35 * DAY_SECONDS,
        ],
        [`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20251014`, 90 * DAY_SECONDS],
      ]),
    )
  })

  test('records a query without results', async () => {
    await logSearchQuery('歌枠', 0)

    expect(multi.sadd.mock.calls).toEqual([
      [REDIS_KEYS.SEARCH_ZERO_RESULTS, '歌枠'],
    ])
  })

  test('does not record a query with results as one without', async () => {
    await logSearchQuery('歌枠', 3)

    expect(multi.sadd).not.toHaveBeenCalled()
  })

  test('does not write anything for a blank query', async () => {
    await logSearchQuery('  ', 0)

    expect(multi.exec).not.toHaveBeenCalled()
  })
})
