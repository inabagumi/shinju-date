import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const query = vi.hoisted(() => ({
  eq: vi.fn(),
  gt: vi.fn(),
  gte: vi.fn(),
  in: vi.fn(),
  is: vi.fn(),
  limit: vi.fn(),
  lt: vi.fn(),
  lte: vi.fn(),
  maybeSingle: vi.fn(),
  neq: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
}))

vi.mock('@shinju-date/logger', () => ({
  logger: { error: vi.fn() },
}))

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseClient: {
    from: vi.fn(() => query),
  },
}))

import { logger } from '@shinju-date/logger'
import { cacheLife, cacheTag } from 'next/cache'
import { supabaseClient } from '@/lib/supabase'
import {
  fetchTalentStreamStarts,
  fetchTalentStreamStatuses,
  fetchTalentStreamStatusesSafe,
} from './talents'
import { DataFetchError } from './unwrap'

const TALENT_IDS = [
  '0f6b7c84-1a1e-4b4e-9d3a-5c7a0c1e2f01',
  '7d2e4b1a-3c5f-4e6a-8b9c-0d1e2f3a4b02',
]

describe('fetchTalentStreamStatuses', () => {
  const [talentId, otherTalentId] = TALENT_IDS as [string, string]
  const youtubeVideo = { youtube_video_id: 'abcdefghijk' }

  function createVideo(
    overrides: Partial<{
      published_at: string
      status: string
      talent_id: string
      twitch_video: { twitch_video_id: string } | null
      youtube_video: { youtube_video_id: string } | null
    }> = {},
  ) {
    return {
      published_at: '2026-11-16T11:00:00Z',
      status: 'UPCOMING',
      talent_id: talentId,
      twitch_video: null,
      youtube_video: youtubeVideo,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockReturnValue(
      Temporal.ZonedDateTime.from('2026-11-15T12:34:56+09:00[Asia/Tokyo]'),
    )

    query.select.mockReturnValue(query)
    query.in.mockReturnValue(query)
    query.lte.mockReturnValue(query)
    query.order.mockResolvedValue({ data: [], error: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('requests the live and upcoming videos within a week by start', async () => {
    await fetchTalentStreamStatuses()

    const select = String(query.select.mock.calls[0]?.[0]).replace(/\s+/g, ' ')

    expect(supabaseClient.from).toHaveBeenCalledWith('videos')
    expect(select).toContain('published_at, status, talent_id')
    expect(select).not.toContain('title')
    expect(query.in).toHaveBeenCalledWith('status', ['LIVE', 'UPCOMING'])
    // A week from the start of the hour, like the upcoming videos of the home
    // page
    expect(query.lte).toHaveBeenCalledWith(
      'published_at',
      '2026-11-22T03:00:00Z',
    )
    expect(query.order).toHaveBeenCalledWith('published_at', {
      ascending: true,
    })
  })

  test('is cached for minutes with the videos tag', async () => {
    await fetchTalentStreamStatuses()

    expect(cacheLife).toHaveBeenCalledWith('minutes')
    expect(cacheTag).toHaveBeenCalledWith('videos')
    expect(cacheTag).not.toHaveBeenCalledWith('talents')
  })

  test('returns the earliest upcoming stream of each talent', async () => {
    query.order.mockResolvedValue({
      data: [
        createVideo({ published_at: '2026-11-15T10:00:00Z' }),
        createVideo({
          published_at: '2026-11-15T12:00:00Z',
          talent_id: otherTalentId,
          twitch_video: { twitch_video_id: '1234567890' },
          youtube_video: null,
        }),
        createVideo({ published_at: '2026-11-16T11:00:00Z' }),
      ],
      error: null,
    })

    await expect(fetchTalentStreamStatuses()).resolves.toEqual({
      [otherTalentId]: {
        isLive: false,
        nextStreamAt: '2026-11-15T12:00:00Z',
      },
      [talentId]: { isLive: false, nextStreamAt: '2026-11-15T10:00:00Z' },
    })
  })

  test('returns no next stream for a talent that is live', async () => {
    query.order.mockResolvedValue({
      data: [
        createVideo({ published_at: '2026-11-15T01:00:00Z', status: 'LIVE' }),
        createVideo({ published_at: '2026-11-15T10:00:00Z' }),
      ],
      error: null,
    })

    await expect(fetchTalentStreamStatuses()).resolves.toEqual({
      [talentId]: { isLive: true, nextStreamAt: null },
    })
  })

  test('skips the videos without YouTube or Twitch videos', async () => {
    query.order.mockResolvedValue({
      data: [
        createVideo({ status: 'LIVE', youtube_video: null }),
        createVideo({ talent_id: otherTalentId, youtube_video: null }),
        createVideo({ published_at: '2026-11-17T11:00:00Z' }),
      ],
      error: null,
    })

    await expect(fetchTalentStreamStatuses()).resolves.toEqual({
      [talentId]: { isLive: false, nextStreamAt: '2026-11-17T11:00:00Z' },
    })
  })

  test('skips the upcoming streams that should have started before this hour', async () => {
    query.order.mockResolvedValue({
      data: [
        createVideo({ published_at: '2026-11-15T02:59:59Z' }),
        createVideo({ published_at: '2026-11-15T03:00:00Z' }),
        createVideo({
          published_at: '2026-11-14T10:00:00Z',
          talent_id: otherTalentId,
        }),
      ],
      error: null,
    })

    await expect(fetchTalentStreamStatuses()).resolves.toEqual({
      [talentId]: { isLive: false, nextStreamAt: '2026-11-15T03:00:00Z' },
    })
  })

  test('throws when the videos cannot be fetched', async () => {
    query.order.mockResolvedValue({
      data: null,
      error: { message: 'failed' },
    })

    await expect(fetchTalentStreamStatuses()).rejects.toThrow('failed')
  })
})

describe('fetchTalentStreamStatusesSafe', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    query.select.mockReturnValue(query)
    query.in.mockReturnValue(query)
    query.lte.mockReturnValue(query)
  })

  test('returns the stream statuses', async () => {
    const [talentId] = TALENT_IDS as [string]

    query.order.mockResolvedValue({
      data: [
        {
          published_at: '2026-11-15T01:00:00Z',
          status: 'LIVE',
          talent_id: talentId,
          twitch_video: null,
          youtube_video: { youtube_video_id: 'abcdefghijk' },
        },
      ],
      error: null,
    })

    await expect(fetchTalentStreamStatusesSafe()).resolves.toEqual({
      [talentId]: { isLive: true, nextStreamAt: null },
    })
    expect(logger.error).not.toHaveBeenCalled()
  })

  test('returns no statuses and logs the error when they cannot be fetched', async () => {
    query.order.mockResolvedValue({
      data: null,
      error: { message: 'failed' },
    })

    await expect(fetchTalentStreamStatusesSafe()).resolves.toEqual({})
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to fetch the stream statuses of the talents',
      { error: expect.any(DataFetchError) },
    )
  })
})

describe('fetchTalentStreamStarts', () => {
  const [talentId] = TALENT_IDS as [string]

  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockReturnValue(
      Temporal.ZonedDateTime.from('2026-11-15T00:34:56+09:00[Asia/Tokyo]'),
    )

    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.gte.mockReturnValue(query)
    query.lt.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.limit.mockResolvedValue({ data: [], error: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('requests the finished streams of the talent for 90 days before today', async () => {
    await fetchTalentStreamStarts(talentId)

    expect(supabaseClient.from).toHaveBeenCalledWith('videos')
    expect(query.select).toHaveBeenCalledWith('published_at')
    expect(query.eq).toHaveBeenCalledWith('talent_id', talentId)
    expect(query.eq).toHaveBeenCalledWith('status', 'ENDED')
    expect(query.eq).toHaveBeenCalledWith('video_kind', 'standard')
    // From 0:00 in Japan 90 days before today to 0:00 of today
    expect(query.gte).toHaveBeenCalledWith(
      'published_at',
      '2026-08-16T15:00:00Z',
    )
    expect(query.lt).toHaveBeenCalledWith(
      'published_at',
      '2026-11-14T15:00:00Z',
    )
    expect(query.limit).toHaveBeenCalledWith(1000)
  })

  test('is cached for days with the videos tag', async () => {
    await fetchTalentStreamStarts(talentId)

    expect(cacheLife).toHaveBeenCalledWith('days')
    expect(cacheTag).toHaveBeenCalledWith('videos')
  })

  test('returns the starts of the streams', async () => {
    query.limit.mockResolvedValue({
      data: [
        { published_at: '2026-11-14T12:00:00+00:00' },
        { published_at: '2026-11-13T13:00:00+00:00' },
      ],
      error: null,
    })

    await expect(fetchTalentStreamStarts(talentId)).resolves.toEqual([
      '2026-11-14T12:00:00+00:00',
      '2026-11-13T13:00:00+00:00',
    ])
  })

  test('throws when the streams cannot be fetched', async () => {
    query.limit.mockResolvedValue({ data: null, error: { message: 'failed' } })

    await expect(fetchTalentStreamStarts(talentId)).rejects.toThrow('failed')
  })
})
