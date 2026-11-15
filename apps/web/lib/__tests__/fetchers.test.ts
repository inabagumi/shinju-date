import { beforeEach, describe, expect, test, vi } from 'vitest'

const query = vi.hoisted(() => ({
  eq: vi.fn(),
  gte: vi.fn(),
  in: vi.fn(),
  is: vi.fn(),
  limit: vi.fn(),
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
  fetchActiveTalents,
  fetchDashboardVideos,
  fetchTalent,
  fetchTalentSummaries,
  fetchVideos,
  type TalentDetail,
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

describe('fetchTalentSummaries', () => {
  const talents = [
    {
      id: TALENT_IDS[0],
      name: '朝霧ミオ',
      twitch_users: [],
      youtube_channels: [
        { profile_image: { blur_data_url: null, id: 'icon-1' } },
      ],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.is.mockReturnValue(query)
    query.order
      .mockReturnValueOnce(query)
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({ data: talents, error: null })
  })

  test('fetches only the active talents that are not deleted, by name', async () => {
    await expect(fetchTalentSummaries()).resolves.toEqual(talents)

    expect(supabaseClient.from).toHaveBeenCalledWith('talents')
    expect(query.eq).toHaveBeenCalledWith('status', 'active')
    expect(query.is).toHaveBeenCalledWith('deleted_at', null)
    expect(query.order).toHaveBeenCalledWith('name', { ascending: true })
  })

  test('fetches only the IDs, the names and the icons', async () => {
    await fetchTalentSummaries()

    const select = String(query.select.mock.calls[0]?.[0]).replace(/\s+/g, '')

    expect(select).toBe(
      'id,name,youtube_channels(profile_image:profile_images(blur_data_url,id)),twitch_users(profile_image:profile_images(blur_data_url,id))',
    )
  })

  test('sorts the channels and users by their platform IDs', async () => {
    await fetchTalentSummaries()

    expect(query.order).toHaveBeenCalledWith('youtube_channel_id', {
      ascending: true,
      referencedTable: 'youtube_channels',
    })
    expect(query.order).toHaveBeenCalledWith('twitch_user_id', {
      ascending: true,
      referencedTable: 'twitch_users',
    })
  })

  test('is cached for days with the talents tag', async () => {
    await fetchTalentSummaries()

    expect(cacheLife).toHaveBeenCalledWith('days')
    expect(cacheTag).toHaveBeenCalledWith('talents')
  })

  test('throws when the talents cannot be fetched', async () => {
    query.order.mockReset()
    query.order
      .mockReturnValueOnce(query)
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({ data: null, error: { message: 'failed' } })

    await expect(fetchTalentSummaries()).rejects.toThrow('failed')
  })
})

describe('fetchTalent', () => {
  const talentId = TALENT_IDS[0] as string

  function createTalent(overrides: Partial<TalentDetail> = {}): TalentDetail {
    return {
      id: talentId,
      name: '朝霧ミオ',
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
