import { REDIS_KEYS, TIME_ZONE } from '@shinju-date/constants'
import type { Pipeline } from '@upstash/redis'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  DAILY_TTL_SECONDS,
  dailyKey,
  hincrbyWithTtl,
  incrWithTtl,
  saddWithTtl,
  WEEKLY_TTL_SECONDS,
  weeklyKey,
  zincrbyWithTtl,
} from '../redis'

const DAY_SECONDS = 24 * 60 * 60

const pipeline = {
  expire: vi.fn(),
  hincrby: vi.fn(),
  incr: vi.fn(),
  sadd: vi.fn(),
  zincrby: vi.fn(),
}
const multi = pipeline as unknown as Pipeline

function at(instant: string): Temporal.ZonedDateTime {
  return Temporal.Instant.from(instant).toZonedDateTimeISO(TIME_ZONE)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TTL', () => {
  test('keeps the daily keys for 90 days and the weekly keys for 35 days', () => {
    expect(DAILY_TTL_SECONDS).toBe(90 * DAY_SECONDS)
    expect(WEEKLY_TTL_SECONDS).toBe(35 * DAY_SECONDS)
  })
})

describe('dailyKey', () => {
  test('appends the date in Japan as YYYYMMDD', () => {
    // 2026-11-17T00:30:00+09:00
    expect(
      dailyKey(REDIS_KEYS.CLICK_VIDEO_PREFIX, at('2026-11-16T15:30:00Z')),
    ).toBe(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}20261117`)
  })

  test('pads the month and the day with zeros', () => {
    expect(
      dailyKey(REDIS_KEYS.SEARCH_VOLUME_PREFIX, at('2026-01-05T03:00:00Z')),
    ).toBe(`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20260105`)
  })
})

describe('weeklyKey', () => {
  test('appends the date of the Monday of the week', () => {
    // 2025-10-14 is a Tuesday
    expect(
      weeklyKey(
        REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX,
        at('2025-10-14T03:00:00Z'),
      ),
    ).toBe(`${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}20251013`)
  })

  test('keeps the date on a Monday', () => {
    expect(
      weeklyKey(
        REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX,
        at('2025-10-13T03:00:00Z'),
      ),
    ).toBe(`${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}20251013`)
  })

  test('goes back to the Monday of the previous month or year', () => {
    // 2026-01-04 is a Sunday
    expect(
      weeklyKey(
        REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX,
        at('2026-01-04T03:00:00Z'),
      ),
    ).toBe(`${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}20251229`)
  })
})

describe('incrWithTtl', () => {
  test('queues the write and the TTL of the same key', () => {
    incrWithTtl(multi, `${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20251014`, 60)

    expect(pipeline.incr.mock.calls).toEqual([
      [`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20251014`],
    ])
    expect(pipeline.expire.mock.calls).toEqual([
      [`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20251014`, 60],
    ])
  })
})

describe('zincrbyWithTtl', () => {
  test('queues the write and the TTL of the same key', () => {
    zincrbyWithTtl(
      multi,
      `${REDIS_KEYS.CLICK_VIDEO_PREFIX}20251014`,
      1,
      'video-a',
      60,
    )

    expect(pipeline.zincrby.mock.calls).toEqual([
      [`${REDIS_KEYS.CLICK_VIDEO_PREFIX}20251014`, 1, 'video-a'],
    ])
    expect(pipeline.expire.mock.calls).toEqual([
      [`${REDIS_KEYS.CLICK_VIDEO_PREFIX}20251014`, 60],
    ])
  })
})

describe('saddWithTtl', () => {
  test('queues the write and the TTL of the same key', () => {
    saddWithTtl(
      multi,
      `${REDIS_KEYS.SESSIONS_TOTAL_PREFIX}20251014`,
      'session-a',
      60,
    )

    expect(pipeline.sadd.mock.calls).toEqual([
      [`${REDIS_KEYS.SESSIONS_TOTAL_PREFIX}20251014`, 'session-a'],
    ])
    expect(pipeline.expire.mock.calls).toEqual([
      [`${REDIS_KEYS.SESSIONS_TOTAL_PREFIX}20251014`, 60],
    ])
  })
})

describe('hincrbyWithTtl', () => {
  test('queues the write and the TTL of the same key', () => {
    hincrbyWithTtl(
      multi,
      `${REDIS_KEYS.SEARCH_SESSIONS_PREFIX}20251014`,
      'session-a',
      1,
      60,
    )

    expect(pipeline.hincrby.mock.calls).toEqual([
      [`${REDIS_KEYS.SEARCH_SESSIONS_PREFIX}20251014`, 'session-a', 1],
    ])
    expect(pipeline.expire.mock.calls).toEqual([
      [`${REDIS_KEYS.SEARCH_SESSIONS_PREFIX}20251014`, 60],
    ])
  })
})
