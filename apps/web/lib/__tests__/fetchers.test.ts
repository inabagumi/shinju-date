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
  fetchActiveAnnouncements,
  fetchActiveTalents,
  fetchCalendarVideos,
  fetchDashboardVideos,
  fetchOldestVideoDate,
  fetchScheduleToday,
  fetchScheduleVideos,
  fetchTalent,
  fetchTalentList,
  fetchTalentStreamStarts,
  fetchTalentStreamStatuses,
  fetchUpcomingVideos,
  fetchVideos,
  type ScheduleVideo,
  type TalentDetail,
  type Video,
} from '../fetchers'

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

describe('fetchActiveAnnouncements', () => {
  const ANNOUNCEMENT = {
    end_at: '2026-11-20T00:00:00+00:00',
    id: '5b0e8a2c-6d4f-4c1a-9e3b-2f7a1c0d4e03',
    level: 'info',
    message: 'メンテナンスのお知らせ',
    start_at: '2026-11-10T00:00:00+00:00',
  } as const

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Temporal.Now, 'instant').mockReturnValue(
      Temporal.Instant.from('2026-11-17T03:00:00Z'),
    )

    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.gt.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.limit.mockResolvedValue({ data: [ANNOUNCEMENT], error: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('requests the enabled announcements that have not ended, newest first', async () => {
    await expect(fetchActiveAnnouncements()).resolves.toEqual([ANNOUNCEMENT])

    expect(supabaseClient.from).toHaveBeenCalledWith('announcements')
    expect(query.select).toHaveBeenCalledWith(
      'id, message, level, start_at, end_at',
    )
    expect(query.eq).toHaveBeenCalledWith('enabled', true)
    expect(query.gt).toHaveBeenCalledWith('end_at', '2026-11-17T03:00:00Z')
    expect(query.lte).not.toHaveBeenCalled()
    expect(query.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    })
    expect(query.limit).toHaveBeenCalledWith(10)
    expect(cacheLife).toHaveBeenCalledWith('minutes')
    expect(cacheTag).toHaveBeenCalledWith('announcements')
  })

  test('throws when the announcements cannot be fetched', async () => {
    query.limit.mockResolvedValue({ data: null, error: { message: 'failed' } })

    await expect(fetchActiveAnnouncements()).rejects.toThrow('failed')
  })
})

describe('fetchActiveTalents', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.is.mockReturnValue(query)
    query.order.mockResolvedValue({
      data: [{ id: TALENT_IDS[0], name: '朝霧ミオ' }],
      error: null,
    })
  })

  test('requests the active talents by name', async () => {
    await expect(fetchActiveTalents()).resolves.toEqual([
      { id: TALENT_IDS[0], name: '朝霧ミオ' },
    ])

    expect(query.select).toHaveBeenCalledWith('id, name')
    expect(query.eq).toHaveBeenCalledWith('status', 'active')
    expect(query.is).toHaveBeenCalledWith('deleted_at', null)
    expect(query.order).toHaveBeenCalledWith('name', { ascending: true })
    expect(cacheTag).toHaveBeenCalledWith('talents')
  })

  test('throws when the talents cannot be fetched', async () => {
    query.order.mockResolvedValue({
      data: null,
      error: { message: 'failed' },
    })

    await expect(fetchActiveTalents()).rejects.toThrow('failed')
  })
})

describe('fetchTalent', () => {
  const talentId = TALENT_IDS[0] as string

  function createTalent(overrides: Partial<TalentDetail> = {}): TalentDetail {
    return {
      id: talentId,
      name: '朝霧ミオ',
      theme_color: null,
      twitch_users: [],
      youtube_channels: [],
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.is.mockReturnValue(query)
    query.maybeSingle.mockResolvedValue({ data: createTalent(), error: null })
  })

  test('fetches only an active talent that is not deleted', async () => {
    expect(await fetchTalent(talentId)).toEqual(createTalent())

    expect(supabaseClient.from).toHaveBeenCalledWith('talents')
    expect(query.eq).toHaveBeenCalledWith('id', talentId)
    expect(query.eq).toHaveBeenCalledWith('status', 'active')
    expect(query.is).toHaveBeenCalledWith('deleted_at', null)
  })

  test('is cached for days with the talents tag', async () => {
    await fetchTalent(talentId)

    expect(cacheLife).toHaveBeenCalledWith('days')
    expect(cacheTag).toHaveBeenCalledWith('talents')
  })

  test('returns null for a talent that is not shown', async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: null })

    expect(await fetchTalent(talentId)).toBeNull()
  })

  test('returns null for an ID that is not a UUID without querying', async () => {
    expect(await fetchTalent('not-a-uuid')).toBeNull()
    expect(supabaseClient.from).not.toHaveBeenCalled()
  })

  test('throws when the talent cannot be fetched', async () => {
    query.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'connection refused' },
    })

    await expect(fetchTalent(talentId)).rejects.toThrow('connection refused')
  })

  test('sorts the channels and users by their platform IDs', async () => {
    query.maybeSingle.mockResolvedValue({
      data: createTalent({
        twitch_users: [
          {
            name: 'B',
            profile_image: null,
            twitch_login_name: 'b',
            twitch_user_id: '200',
          },
          {
            name: 'A',
            profile_image: null,
            twitch_login_name: 'a',
            twitch_user_id: '100',
          },
        ],
        youtube_channels: [
          {
            name: 'Sub',
            profile_image: null,
            youtube_channel_id: 'UCb',
            youtube_handle: null,
          },
          {
            name: 'Main',
            profile_image: null,
            youtube_channel_id: 'UCa',
            youtube_handle: null,
          },
        ],
      }),
      error: null,
    })

    const talent = await fetchTalent(talentId)

    expect(talent?.youtube_channels.map((channel) => channel.name)).toEqual([
      'Main',
      'Sub',
    ])
    expect(talent?.twitch_users.map((user) => user.name)).toEqual(['A', 'B'])
  })
})

describe('fetchTalentList', () => {
  // The talents are sorted by reading and then by name, so the query is
  // resolved by the second `order`
  const mockTalentRows = (result: { data: unknown; error: unknown }) => {
    query.order.mockImplementation((column: string) =>
      column === 'name' ? Promise.resolve(result) : query,
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()

    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.is.mockReturnValue(query)
    mockTalentRows({
      data: [
        {
          id: TALENT_IDS[0],
          name: '朝霧ミオ',
          twitch_users: [],
          youtube_channels: [],
        },
      ],
      error: null,
    })
  })

  test('fetches the active talents that are not deleted', async () => {
    await expect(fetchTalentList()).resolves.toEqual([
      {
        id: TALENT_IDS[0],
        name: '朝霧ミオ',
        twitch_users: [],
        youtube_channels: [],
      },
    ])

    expect(supabaseClient.from).toHaveBeenCalledWith('talents')
    expect(query.eq).toHaveBeenCalledWith('status', 'active')
    expect(query.is).toHaveBeenCalledWith('deleted_at', null)
  })

  test('sorts by reading, and the talents without one by name last', async () => {
    await fetchTalentList()

    expect(query.order).toHaveBeenCalledTimes(2)
    expect(query.order).toHaveBeenNthCalledWith(1, 'reading', {
      ascending: true,
      nullsFirst: false,
    })
    expect(query.order).toHaveBeenNthCalledWith(2, 'name', { ascending: true })
  })

  test('keeps the order of the talents from the database', async () => {
    const row = (id: string, name: string) => ({
      id,
      name,
      twitch_users: [],
      youtube_channels: [],
    })

    mockTalentRows({
      data: [
        row(TALENT_IDS[1] as string, '風花リツ'),
        row(TALENT_IDS[0] as string, '朝霧ミオ'),
      ],
      error: null,
    })

    const talents = await fetchTalentList()

    expect(talents.map((talent) => talent.name)).toEqual([
      '風花リツ',
      '朝霧ミオ',
    ])
  })

  test('is cached for days with the talents tag', async () => {
    await fetchTalentList()

    expect(cacheLife).toHaveBeenCalledWith('days')
    expect(cacheTag).toHaveBeenCalledWith('talents')
  })

  test('selects only the names and the icons of the accounts', async () => {
    await fetchTalentList()

    const select = String(query.select.mock.calls[0]?.[0]).replace(/\s+/g, ' ')

    expect(select).toContain('profile_image:profile_images (blur_data_url, id)')
    expect(select).not.toContain('youtube_handle')
    expect(select).not.toContain('twitch_login_name')
  })

  test('returns the icons in the same order as fetchTalent', async () => {
    const icon = (id: string) => ({ blur_data_url: '', id })

    mockTalentRows({
      data: [
        {
          id: TALENT_IDS[0],
          name: '朝霧ミオ',
          twitch_users: [
            { profile_image: icon('twitch-b'), twitch_user_id: '200' },
            { profile_image: icon('twitch-a'), twitch_user_id: '100' },
          ],
          youtube_channels: [
            { profile_image: icon('youtube-b'), youtube_channel_id: 'UCb' },
            { profile_image: null, youtube_channel_id: 'UCa' },
          ],
        },
      ],
      error: null,
    })

    const [talent] = await fetchTalentList()

    expect(talent).toEqual({
      id: TALENT_IDS[0],
      name: '朝霧ミオ',
      twitch_users: [
        { profile_image: icon('twitch-a') },
        { profile_image: icon('twitch-b') },
      ],
      youtube_channels: [
        { profile_image: null },
        { profile_image: icon('youtube-b') },
      ],
    })
  })

  test('throws when the talents cannot be fetched', async () => {
    mockTalentRows({
      data: null,
      error: { message: 'failed' },
    })

    await expect(fetchTalentList()).rejects.toThrow('failed')
  })
})

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
      youtube_video: { youtube_channel: null, youtube_video_id: `YT${index}` },
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
      youtube_video: { youtube_channel: null, youtube_video_id: `YT${index}` },
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
