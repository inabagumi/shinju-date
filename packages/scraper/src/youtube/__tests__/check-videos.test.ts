import { Temporal } from 'temporal-polyfill'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestContext } from '../../internal/testing/context.js'
import {
  postgresError,
  setupSupabase,
} from '../../internal/testing/supabase.js'
import {
  refreshYouTubeVideos,
  removeUnavailableYouTubeVideos,
} from '../check-videos.js'
import type { YouTubeFetcher } from '../fetcher.js'
import type { YouTubeVideo } from '../types.js'

const supabase = setupSupabase()
const now = Temporal.Instant.from('2024-05-01T12:00:00.500Z')
const reportError = vi.fn()
const createContext = <T>(fetcher: T) =>
  createTestContext({
    fetcher,
    now,
    reportError,
    supabaseClient: supabase.supabaseClient,
  })

interface SavedRow {
  duration: string
  id: string
  published_at: string
  status: 'UPCOMING' | 'LIVE' | 'ENDED' | 'PUBLISHED'
  thumbnail_id: string | null
  title: string
  video_kind: 'standard' | 'short'
  youtube_video: { youtube_video_id: string }
}

function createSavedRow(
  id: string,
  overrides: Partial<SavedRow> = {},
): SavedRow {
  return {
    duration: 'P0D',
    id: `video-${id}`,
    published_at: '2024-05-01T13:00:00+00:00',
    status: 'UPCOMING',
    thumbnail_id: `thumb-${id}`,
    title: `Video ${id}`,
    video_kind: 'standard',
    youtube_video: { youtube_video_id: id },
    ...overrides,
  }
}

function createUpcomingVideo(
  id: string,
  overrides: Partial<YouTubeVideo> = {},
): YouTubeVideo {
  return {
    contentDetails: {},
    id,
    liveStreamingDetails: { scheduledStartTime: '2024-05-01T13:00:00Z' },
    snippet: { publishedAt: '2024-04-30T00:00:00Z', title: `Video ${id}` },
    ...overrides,
  }
}

function createFetcher(videos: YouTubeVideo[], missingIds: string[] = []) {
  const getVideos = vi.fn(async () => ({ missingIds, videos }))
  const findMissingVideoIds = vi.fn(async () => missingIds)

  return {
    fetcher: { findMissingVideoIds, getVideos } as unknown as YouTubeFetcher,
    findMissingVideoIds,
    getVideos,
  }
}

describe('refreshYouTubeVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads scheduled and live videos of active talents by default', async () => {
    supabase.respond(() => [])
    const { getVideos, fetcher } = createFetcher([])

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'live')

    expect(changed).toBe(0)
    expect(getVideos).not.toHaveBeenCalled()
    expect(supabase.requests[0]?.query).toMatchObject({
      deleted_at: 'is.null',
      platform: 'eq.youtube',
      status: 'in.(UPCOMING,LIVE)',
      'talent.deleted_at': 'is.null',
      'talent.status': 'eq.active',
    })
    expect(supabase.requests[0]?.query).not.toHaveProperty('limit')
  })

  it('loads the newest finished videos in recent mode', async () => {
    supabase.respond(() => [])
    const { fetcher } = createFetcher([])

    await refreshYouTubeVideos(createContext(fetcher), 'recent')

    expect(supabase.requests[0]?.query).toMatchObject({
      limit: '100',
      order: 'published_at.desc',
      status: 'in.(ENDED,PUBLISHED)',
    })
  })

  it('updates only the videos that changed, and only what changed', async () => {
    supabase.respond(({ method }) =>
      method === 'GET' ? [createSavedRow('a'), createSavedRow('b')] : [],
    )
    const { getVideos, fetcher } = createFetcher([
      createUpcomingVideo('a'),
      createUpcomingVideo('b', {
        liveStreamingDetails: {
          actualStartTime: '2024-05-01T11:58:00Z',
          scheduledStartTime: '2024-05-01T13:00:00Z',
        },
      }),
    ])

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'live')

    expect(changed).toBeGreaterThan(0)
    expect(getVideos).toHaveBeenCalledWith(['a', 'b'])
    expect(supabase.written('PATCH', 'videos')).toEqual([
      expect.objectContaining({
        body: {
          published_at: '2024-05-01T11:58:00Z',
          status: 'LIVE',
          updated_at: '2024-05-01T12:00:00Z',
        },
        query: { id: 'eq.video-b' },
      }),
    ])
  })

  it('deletes videos YouTube no longer returns, with their thumbnails', async () => {
    supabase.respond(({ method, table }) => {
      if (method === 'GET') {
        return [createSavedRow('a'), createSavedRow('gone')]
      }

      return table === 'videos' ? [{ id: 'video-gone' }] : []
    })
    const { fetcher } = createFetcher([createUpcomingVideo('a')], ['gone'])

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'live')

    expect(changed).toBeGreaterThan(0)
    expect(supabase.written('PATCH', 'videos')[0]).toMatchObject({
      body: {
        deleted_at: '2024-05-01T12:00:00Z',
        deleted_reason: 'unavailable',
      },
      query: { id: 'in.(video-gone)' },
    })
    expect(supabase.written('PATCH', 'thumbnails')[0]).toMatchObject({
      body: { deleted_at: '2024-05-01T12:00:00Z' },
      query: { id: 'in.(thumb-gone)' },
    })
  })

  it('deletes the videos even when YouTube returns none of them', async () => {
    supabase.respond(({ method, table }) => {
      if (method === 'GET') {
        return [createSavedRow('gone', { thumbnail_id: null })]
      }

      return table === 'videos' ? [{ id: 'video-gone' }] : []
    })
    const { fetcher } = createFetcher([], ['gone'])

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'live')

    expect(changed).toBeGreaterThan(0)
    expect(supabase.written('PATCH', 'videos')).toHaveLength(1)
    expect(supabase.written('PATCH', 'thumbnails')).toHaveLength(0)
  })

  it('reports a video that could not be updated and handles the rest', async () => {
    supabase.respond(({ method, query }) => {
      if (method === 'GET') {
        return [createSavedRow('a'), createSavedRow('b')]
      }

      return query['id'] === 'eq.video-a'
        ? postgresError('40001', 'could not serialize access')
        : []
    })
    const { fetcher } = createFetcher([
      createUpcomingVideo('a', {
        snippet: { publishedAt: '2024-04-30T00:00:00Z', title: 'Renamed a' },
      }),
      createUpcomingVideo('b', {
        snippet: { publishedAt: '2024-04-30T00:00:00Z', title: 'Renamed b' },
      }),
    ])

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'live')

    expect(changed).toBeGreaterThan(0)
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('could not serialize access'),
      }),
      { youtubeVideoId: 'a' },
    )
  })

  it('reports no change when everything is up to date', async () => {
    supabase.respond(({ method }) =>
      method === 'GET' ? [createSavedRow('a')] : [],
    )
    const { fetcher } = createFetcher([createUpcomingVideo('a')])

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'live')

    expect(changed).toBe(0)
    expect(supabase.requests).toHaveLength(1)
  })
})

describe('removeUnavailableYouTubeVideos', () => {
  function createPage(from: number, size: number) {
    return Array.from({ length: size }, (_, i) => {
      const n = String(from + i).padStart(4, '0')

      return {
        id: `video-${n}`,
        thumbnail_id: `thumb-${n}`,
        youtube_video: { youtube_video_id: `yt-${n}` },
      }
    })
  }

  it('walks every video page by page, continuing after the last ID', async () => {
    const cursors: (string | undefined)[] = []
    supabase.respond(({ method, query }) => {
      if (method !== 'GET') {
        return []
      }

      cursors.push(query['id'])

      switch (query['id']) {
        case undefined:
          return createPage(0, 1000)
        case 'gt.video-0999':
          return createPage(1000, 3)
        default:
          return []
      }
    })
    const { findMissingVideoIds, fetcher } = createFetcher([])

    const changed = await removeUnavailableYouTubeVideos(createContext(fetcher))

    expect(changed).toBe(0)
    expect(cursors).toEqual([undefined, 'gt.video-0999', 'gt.video-1002'])
    expect(findMissingVideoIds).toHaveBeenCalledTimes(2)
    expect(findMissingVideoIds.mock.calls[1]).toEqual([
      ['yt-1000', 'yt-1001', 'yt-1002'],
    ])
    expect(supabase.requests[0]?.query).toMatchObject({
      deleted_at: 'is.null',
      limit: '1000',
      order: 'id.asc',
      platform: 'eq.youtube',
      'talent.deleted_at': 'is.null',
    })
    expect(supabase.requests[0]?.query).not.toHaveProperty('talent.status')
  })

  it('deletes the videos YouTube no longer returns', async () => {
    supabase.respond(({ method, query, table }) => {
      if (method === 'GET') {
        return query['id'] ? [] : createPage(0, 3)
      }

      return table === 'videos' ? [{ id: 'video-0001' }] : []
    })
    const { fetcher } = createFetcher([], ['yt-0001'])

    const changed = await removeUnavailableYouTubeVideos(createContext(fetcher))

    expect(changed).toBeGreaterThan(0)
    expect(supabase.written('PATCH', 'videos')[0]?.query['id']).toBe(
      'in.(video-0001)',
    )
    expect(supabase.written('PATCH', 'thumbnails')[0]?.query['id']).toBe(
      'in.(thumb-0001)',
    )
  })

  it('does not call YouTube when there are no videos', async () => {
    supabase.respond(() => [])
    const { findMissingVideoIds, fetcher } = createFetcher([])

    const changed = await removeUnavailableYouTubeVideos(createContext(fetcher))

    expect(changed).toBe(0)
    expect(findMissingVideoIds).not.toHaveBeenCalled()
  })
})
