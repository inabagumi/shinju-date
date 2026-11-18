import { beforeEach, describe, expect, test, vi } from 'vitest'

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

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseClient: {
    from: vi.fn(() => query),
  },
}))

import { cacheLife, cacheTag } from 'next/cache'
import { supabaseClient } from '@/lib/supabase'
import {
  fetchOldestVideoDate,
  fetchScheduleToday,
  fetchScheduleVideos,
  type ScheduleVideo,
} from './schedule'

describe('fetchScheduleVideos', () => {
  function createScheduleVideo(
    index: number,
    overrides: Partial<ScheduleVideo> = {},
  ): ScheduleVideo {
    return {
      duration: 'PT1H',
      id: `video-${index}`,
      platform: 'youtube',
      published_at: '2026-11-10T12:00:00Z',
      status: 'ENDED',
      talent: { id: 'talent-1', name: '朝霧ミオ', theme_color: null },
      title: `動画${index}`,
      twitch_video: null,
      video_kind: 'standard',
      youtube_video: {
        youtube_channel: {
          name: null,
          profile_image: null,
          youtube_handle: null,
        },
        youtube_video_id: `YT${index}`,
      },
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    query.select.mockReturnValue(query)
    query.gte.mockReturnValue(query)
    query.lt.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.limit.mockResolvedValue({ data: [], error: null })
  })

  test('requests the standard videos from Sunday to Saturday in Japan', async () => {
    await fetchScheduleVideos('2026-11-08')

    expect(supabaseClient.from).toHaveBeenCalledWith('videos')
    // 00:00 on Sunday, 8 November and on Sunday, 15 November in Japan
    expect(query.gte).toHaveBeenCalledWith(
      'published_at',
      '2026-11-07T15:00:00Z',
    )
    expect(query.lt).toHaveBeenCalledWith(
      'published_at',
      '2026-11-14T15:00:00Z',
    )
    expect(query.eq).toHaveBeenCalledWith('video_kind', 'standard')
    expect(query.eq).not.toHaveBeenCalledWith('status', expect.anything())
    expect(query.order).toHaveBeenCalledWith('published_at', {
      ascending: true,
    })
    expect(query.limit).toHaveBeenCalledWith(1000)
    expect(cacheLife).toHaveBeenCalledWith('hours')
    expect(cacheTag).toHaveBeenCalledWith('videos')
  })

  test('does not select the thumbnail but the theme color', async () => {
    await fetchScheduleVideos('2026-11-08')

    const select = query.select.mock.calls[0]?.[0] as string

    expect(select).not.toMatch(/thumbnail/)
    expect(select).toMatch(/talent:talents!inner \(id, name, theme_color\)/)
  })

  test('drops the videos without a YouTube or Twitch video', async () => {
    query.limit.mockResolvedValue({
      data: [
        createScheduleVideo(1),
        createScheduleVideo(2, { youtube_video: null }),
      ],
      error: null,
    })

    expect(
      (await fetchScheduleVideos('2026-11-08')).map((video) => video.id),
    ).toEqual(['video-1'])
  })

  test('throws when the videos cannot be fetched', async () => {
    query.limit.mockResolvedValue({ data: null, error: { message: 'failed' } })

    await expect(fetchScheduleVideos('2026-11-08')).rejects.toThrow('failed')
  })
})

describe('fetchOldestVideoDate', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    query.select.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.limit.mockReturnValue(query)
  })

  test('returns the date in Japan the oldest video starts on', async () => {
    // 00:30 on 1 April 2019 in Japan
    query.maybeSingle.mockResolvedValue({
      data: { published_at: '2019-03-31T15:30:00Z' },
      error: null,
    })

    await expect(fetchOldestVideoDate()).resolves.toBe('2019-04-01')
    expect(query.order).toHaveBeenCalledWith('published_at', {
      ascending: true,
    })
    expect(query.limit).toHaveBeenCalledWith(1)
    expect(cacheLife).toHaveBeenCalledWith('days')
    expect(cacheTag).toHaveBeenCalledWith('videos')
  })

  test('returns null without any video', async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null })

    await expect(fetchOldestVideoDate()).resolves.toBeNull()
  })
})

describe('fetchScheduleToday', () => {
  test('returns today in Japan', async () => {
    // 00:30 on Monday, 16 November 2026 in Japan, still Sunday in UTC
    const spy = vi
      .spyOn(Temporal.Now, 'zonedDateTimeISO')
      .mockImplementation((timeZone) =>
        Temporal.Instant.from('2026-11-15T15:30:00Z').toZonedDateTimeISO(
          timeZone ?? 'UTC',
        ),
      )

    await expect(fetchScheduleToday()).resolves.toBe('2026-11-16')
    expect(cacheLife).toHaveBeenCalledWith('minutes')

    spy.mockRestore()
  })
})
