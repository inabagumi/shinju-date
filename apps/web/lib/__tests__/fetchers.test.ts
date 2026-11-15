import { beforeEach, describe, expect, test, vi } from 'vitest'

const query = vi.hoisted(() => ({
  eq: vi.fn(),
  gte: vi.fn(),
  in: vi.fn(),
  is: vi.fn(),
  limit: vi.fn(),
  lte: vi.fn(),
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

import { cacheTag } from 'next/cache'
import {
  countVideos,
  fetchActiveTalents,
  fetchDashboardVideos,
  fetchVideos,
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
      data: [{ id: TALENT_IDS[0], name: '一ノ瀬うるは' }],
      error: null,
    })
  })

  test('requests the active talents by name', async () => {
    await expect(fetchActiveTalents()).resolves.toEqual([
      { id: TALENT_IDS[0], name: '一ノ瀬うるは' },
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
