import { REDIS_KEYS } from '@shinju-date/constants'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { logSearchQuery } from '../search-analytics'

const multi = {
  exec: vi.fn(),
  expire: vi.fn(),
  incr: vi.fn(),
  sadd: vi.fn(),
  zincrby: vi.fn(),
}

vi.mock('../redis', () => ({
  getRedisClient: () => ({ multi: () => multi }),
}))

vi.mock('../session-analytics', () => ({
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

  test('sets a TTL on every daily and weekly key', async () => {
    await logSearchQuery('歌枠', 3)

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
    expect(multi.expire).toHaveBeenCalledTimes(3)
    expect(multi.exec).toHaveBeenCalledOnce()
  })

  test('increments the daily search volume', async () => {
    await logSearchQuery('歌枠', 3)

    expect(multi.incr).toHaveBeenCalledWith(
      `${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20251014`,
    )
  })

  test('does not write anything for a blank query', async () => {
    await logSearchQuery('  ', 0)

    expect(multi.exec).not.toHaveBeenCalled()
  })
})
