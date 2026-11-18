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

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

const rpc = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({
  supabaseClient: {
    from: vi.fn(() => query),
    rpc,
  },
}))

import { cacheLife, cacheTag } from 'next/cache'
import { supabaseClient } from '@/lib/supabase'
import {
  countVideos,
  fetchCalendarVideos,
  fetchCurrentTime,
  fetchDashboardVideos,
  fetchUpcomingVideos,
  fetchVideos,
  type Video,
} from './videos'

const TALENT_IDS = [
  '0f6b7c84-1a1e-4b4e-9d3a-5c7a0c1e2f01',
  '7d2e4b1a-3c5f-4e6a-8b9c-0d1e2f3a4b02',
]

describe('fetchVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    rpc.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    })
  })

  test('searches the videos of all talents by default', async () => {
    await fetchVideos({ query: '歌' })

    expect(rpc).toHaveBeenCalledWith(
      'search_videos_v3',
      expect.objectContaining({ channel_ids: [], query: '歌' }),
    )
  })

  test('searches only the videos of the given talents', async () => {
    await fetchVideos({ kind: 'short', talentIds: TALENT_IDS })

    expect(rpc).toHaveBeenCalledWith(
      'search_videos_v3',
      expect.objectContaining({
        channel_ids: TALENT_IDS,
        video_kinds: ['short'],
      }),
    )
  })
})

describe('countVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    rpc.mockResolvedValue({ data: 3, error: null })
  })

  test('counts the videos of all talents by default', async () => {
    await expect(countVideos({})).resolves.toBe(3)

    expect(rpc).toHaveBeenCalledWith(
      'count_videos_v1',
      expect.objectContaining({ channel_ids: [] }),
    )
  })

  test('counts only the videos of the given talents', async () => {
    await countVideos({ query: '歌', talentIds: TALENT_IDS })

    expect(rpc).toHaveBeenCalledWith(
      'count_videos_v1',
      expect.objectContaining({ channel_ids: TALENT_IDS, query: '歌' }),
    )
  })
})

describe('fetchCalendarVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockImplementation((timeZone) =>
      Temporal.Instant.from('2026-11-15T03:20:45.5Z').toZonedDateTimeISO(
        timeZone ?? 'UTC',
      ),
    )

    query.select.mockReturnValue(query)
    query.lt.mockReturnValue(query)
    query.in.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.limit.mockResolvedValue({ data: [], error: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('requests the latest 100 videos until a week later', async () => {
    await fetchCalendarVideos()

    expect(supabaseClient.from).toHaveBeenCalledWith('videos')
    // The start of the hour a week later
    expect(query.lt).toHaveBeenCalledWith(
      'published_at',
      '2026-11-22T03:00:00Z',
    )
    expect(query.in).not.toHaveBeenCalled()
    expect(query.eq).not.toHaveBeenCalled()
    expect(query.order).toHaveBeenCalledWith('published_at', {
      ascending: false,
    })
    expect(query.limit).toHaveBeenCalledWith(100)
    expect(cacheLife).toHaveBeenCalledWith('hours')
    expect(cacheTag).toHaveBeenCalledWith('videos')
  })

  test('narrows the videos by the talents and the kind', async () => {
    await fetchCalendarVideos({ kind: 'short', talentIds: TALENT_IDS })

    expect(query.in).toHaveBeenCalledWith('talent_id', TALENT_IDS)
    expect(query.eq).toHaveBeenCalledWith('video_kind', 'short')
  })

  test('leaves out the videos without a platform source', async () => {
    const video = {
      duration: 'PT1H',
      id: 'video-1',
      platform: 'youtube',
      published_at: '2026-11-15T12:00:00Z',
      status: 'ENDED',
      talent: { name: '朝霧ミオ' },
      title: '歌枠',
      twitch_video: null,
      youtube_video: { youtube_video_id: 'abc123' },
    }

    query.limit.mockResolvedValue({
      data: [video, { ...video, id: 'video-2', youtube_video: null }],
      error: null,
    })

    await expect(fetchCalendarVideos()).resolves.toEqual([video])
  })

  test('throws when the videos cannot be fetched', async () => {
    query.limit.mockResolvedValue({ data: null, error: { message: 'failed' } })

    await expect(fetchCalendarVideos()).rejects.toThrow('failed')
  })
})

describe('fetchDashboardVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.gte.mockReturnValue(query)
    query.in.mockReturnValue(query)
    query.lte.mockReturnValue(query)
    query.neq.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.limit.mockResolvedValue({ data: [], error: null })
  })

  test('only requests PUBLISHED videos for the recent-videos tab', async () => {
    await fetchDashboardVideos()

    expect(query.eq).toHaveBeenCalledWith('status', 'PUBLISHED')
    expect(query.in).not.toHaveBeenCalledWith('status', ['PUBLISHED', 'ENDED'])
  })
})

describe('fetchUpcomingVideos', () => {
  function createVideo(index: number, overrides: Partial<Video> = {}): Video {
    return {
      duration: 'P0D',
      id: `video-${index}`,
      platform: 'youtube',
      published_at: '2026-11-16T11:00:00Z',
      status: 'UPCOMING',
      talent: { id: 'talent-1', name: '朝霧ミオ' },
      thumbnail: null,
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

    vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockReturnValue(
      Temporal.ZonedDateTime.from('2026-11-15T12:34:56+09:00[Asia/Tokyo]'),
    )

    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.gte.mockReturnValue(query)
    query.lte.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.limit.mockResolvedValue({ data: [], error: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('requests the nearest 100 upcoming videos from this hour to a week later', async () => {
    await fetchUpcomingVideos()

    expect(supabaseClient.from).toHaveBeenCalledWith('videos')
    expect(query.eq).toHaveBeenCalledWith('status', 'UPCOMING')
    // The start of the hour, the same as `fetchTalentStreamStatuses`, so the
    // streams that should have started before it are left out
    expect(query.gte).toHaveBeenCalledWith(
      'published_at',
      '2026-11-15T03:00:00Z',
    )
    expect(query.lte).toHaveBeenCalledWith(
      'published_at',
      '2026-11-22T03:00:00Z',
    )
    expect(query.order).toHaveBeenCalledWith('published_at', {
      ascending: true,
    })
    expect(query.limit).toHaveBeenCalledWith(100)
    expect(cacheLife).toHaveBeenCalledWith('hours')
    expect(cacheTag).toHaveBeenCalledWith('videos')
  })

  test('returns the videos with today in Japan', async () => {
    query.limit.mockResolvedValue({
      data: [createVideo(1), createVideo(2)],
      error: null,
    })

    const { today, videos } = await fetchUpcomingVideos()

    expect(today).toBe('2026-11-15')
    expect(videos.map((video) => video.id)).toEqual(['video-1', 'video-2'])
  })

  test('drops the videos without a YouTube or Twitch video', async () => {
    query.limit.mockResolvedValue({
      data: [createVideo(1), createVideo(2, { youtube_video: null })],
      error: null,
    })

    const { videos } = await fetchUpcomingVideos()

    expect(videos.map((video) => video.id)).toEqual(['video-1'])
  })

  test('throws when the videos cannot be fetched', async () => {
    query.limit.mockResolvedValue({ data: null, error: { message: 'failed' } })

    await expect(fetchUpcomingVideos()).rejects.toThrow('failed')
  })
})

describe('fetchCurrentTime', () => {
  test('returns the current time in Japan', async () => {
    const spy = vi
      .spyOn(Temporal.Now, 'zonedDateTimeISO')
      .mockImplementation((timeZone) =>
        Temporal.Instant.from('2026-11-15T15:30:00Z').toZonedDateTimeISO(
          timeZone ?? 'UTC',
        ),
      )

    await expect(fetchCurrentTime()).resolves.toBe(
      '2026-11-16T00:30:00+09:00[Asia/Tokyo]',
    )
    expect(cacheLife).toHaveBeenCalledWith('hours')

    spy.mockRestore()
  })
})
