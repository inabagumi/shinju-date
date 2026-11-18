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
  fetchActiveTalents,
  fetchTalent,
  fetchTalentList,
  type TalentDetail,
} from './talents'

const TALENT_IDS = [
  '0f6b7c84-1a1e-4b4e-9d3a-5c7a0c1e2f01',
  '7d2e4b1a-3c5f-4e6a-8b9c-0d1e2f3a4b02',
]

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
