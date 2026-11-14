import { Temporal } from 'temporal-polyfill'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestContext } from '../../internal/testing/context.js'
import { setupSupabase } from '../../internal/testing/supabase.js'
import {
  createClip,
  createSavedVideo,
  createVideo,
} from '../../internal/testing/twitch.js'
import { createThumbnail } from '../../internal/thumbnails/index.js'
import {
  refreshRecentTwitchVideos,
  removeUnavailableTwitchVideos,
} from '../check-videos.js'
import type { TwitchFetcher } from '../fetcher.js'
import type { SavedTwitchVideo } from '../saved-video.js'

vi.mock('../../internal/thumbnails/index.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../internal/thumbnails/index.js')
  >()),
  createThumbnail: vi.fn(),
  removeThumbnail: vi.fn(),
}))

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

/** A saved archive that matches `createVideo()` exactly. */
function createSavedArchive(
  overrides: Parameters<typeof createSavedVideo>[0] = {},
): SavedTwitchVideo {
  const { twitch_video: twitchVideo, ...video } = overrides

  return createSavedVideo({
    duration: 'PT2H',
    status: 'ENDED',
    thumbnail_id: 'thumb-1',
    title: 'Archive',
    ...video,
    twitch_video: {
      twitch_video_id: 'vod-1',
      type: 'archive',
      ...twitchVideo,
    },
  })
}

interface FetcherOptions {
  clips?: ReturnType<typeof createClip>[]
  missingClipIds?: string[]
  missingVideoIds?: string[]
  videos?: ReturnType<typeof createVideo>[]
}

function createFetcher({
  clips = [],
  missingClipIds = [],
  missingVideoIds = [],
  videos = [],
}: FetcherOptions) {
  const getClips = vi.fn(async () => ({ clips, missingIds: missingClipIds }))
  const getVideos = vi.fn(async () => ({ missingIds: missingVideoIds, videos }))

  return {
    fetcher: { getClips, getVideos } as unknown as TwitchFetcher,
    getClips,
    getVideos,
  }
}

describe('refreshRecentTwitchVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createThumbnail).mockResolvedValue({
      id: 'thumb-new',
      path: 'vod-1/x.jpg',
    })
  })

  it('loads the newest finished videos of active talents', async () => {
    supabase.respond(() => [])
    const { getVideos, fetcher } = createFetcher({})

    const changed = await refreshRecentTwitchVideos(createContext(fetcher))

    expect(changed).toBe(0)
    expect(getVideos).not.toHaveBeenCalled()
    expect(supabase.requests[0]?.query).toMatchObject({
      deleted_at: 'is.null',
      limit: '100',
      order: 'published_at.desc',
      platform: 'eq.twitch',
      status: 'in.(ENDED,PUBLISHED)',
      'talent.status': 'eq.active',
    })
  })

  it('updates what changed on Twitch', async () => {
    supabase.respond(({ method }) =>
      method === 'GET' ? [createSavedArchive()] : [],
    )
    const { fetcher } = createFetcher({
      videos: [createVideo({ duration: 'PT2H30M', title: 'Renamed' })],
    })

    const changed = await refreshRecentTwitchVideos(createContext(fetcher))

    expect(changed).toBeGreaterThan(0)
    expect(supabase.written('PATCH', 'videos')).toEqual([
      expect.objectContaining({
        body: {
          duration: 'PT2H30M',
          title: 'Renamed',
          updated_at: '2024-05-01T12:00:00Z',
        },
        query: { id: 'eq.video-1' },
      }),
    ])
    expect(supabase.written('PATCH', 'twitch_videos')).toHaveLength(0)
  })

  it('follows a video that changed its type', async () => {
    supabase.respond(({ method }) =>
      method === 'GET' ? [createSavedArchive()] : [],
    )
    const { fetcher } = createFetcher({
      videos: [createVideo({ type: 'highlight' })],
    })

    const changed = await refreshRecentTwitchVideos(createContext(fetcher))

    expect(changed).toBeGreaterThan(0)
    expect(supabase.written('PATCH', 'twitch_videos')[0]).toMatchObject({
      body: { type: 'highlight' },
      query: { id: 'eq.twitch-row-1' },
    })
    expect(supabase.written('PATCH', 'videos')).toHaveLength(0)
  })

  it('looks clips up separately from videos', async () => {
    supabase.respond(({ method }) =>
      method === 'GET'
        ? [
            createSavedArchive(),
            createSavedArchive({
              duration: 'PT30S',
              id: 'video-2',
              status: 'PUBLISHED',
              title: 'Old clip title',
              twitch_video: {
                id: 'twitch-row-2',
                stream_id: null,
                twitch_video_id: 'clip-1',
                type: 'clip',
              },
            }),
          ]
        : [],
    )
    const { getClips, getVideos, fetcher } = createFetcher({
      clips: [createClip()],
      videos: [createVideo()],
    })

    await refreshRecentTwitchVideos(createContext(fetcher))

    expect(getVideos).toHaveBeenCalledWith(['vod-1'])
    expect(getClips).toHaveBeenCalledWith(['clip-1'])
    expect(supabase.written('PATCH', 'videos')).toEqual([
      expect.objectContaining({
        body: { title: 'Clip', updated_at: '2024-05-01T12:00:00Z' },
        query: { id: 'eq.video-2' },
      }),
    ])
  })

  it('fills in a thumbnail Twitch did not have when the video was saved', async () => {
    supabase.respond(({ method }) =>
      method === 'GET' ? [createSavedArchive({ thumbnail_id: null })] : [],
    )
    const { fetcher } = createFetcher({ videos: [createVideo()] })

    const changed = await refreshRecentTwitchVideos(createContext(fetcher))

    expect(changed).toBeGreaterThan(0)
    expect(createThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: 'vod-1',
        source: expect.objectContaining({
          url: 'https://cdn.test/vod-1280x720.jpg',
        }),
      }),
    )
    expect(supabase.written('PATCH', 'videos')[0]?.body).toEqual({
      thumbnail_id: 'thumb-new',
      updated_at: '2024-05-01T12:00:00Z',
    })
  })

  it('keeps the thumbnail a video already has', async () => {
    supabase.respond(({ method }) =>
      method === 'GET' ? [createSavedArchive()] : [],
    )
    const { fetcher } = createFetcher({ videos: [createVideo()] })

    const changed = await refreshRecentTwitchVideos(createContext(fetcher))

    expect(changed).toBe(0)
    expect(createThumbnail).not.toHaveBeenCalled()
  })

  it('deletes videos Twitch no longer returns, with their thumbnails', async () => {
    supabase.respond(({ method, table }) => {
      if (method === 'GET') {
        return [createSavedArchive()]
      }

      return table === 'videos' ? [{ id: 'video-1' }] : []
    })
    const { fetcher } = createFetcher({ missingVideoIds: ['vod-1'] })

    const changed = await refreshRecentTwitchVideos(createContext(fetcher))

    expect(changed).toBeGreaterThan(0)
    expect(supabase.written('PATCH', 'videos')[0]).toMatchObject({
      body: { deleted_reason: 'unavailable' },
      query: { id: 'in.(video-1)' },
    })
    expect(supabase.written('PATCH', 'thumbnails')[0]?.query['id']).toBe(
      'in.(thumb-1)',
    )
  })

  it('never looks up or deletes a broadcast that has no archive', async () => {
    supabase.respond(({ method }) =>
      method === 'GET' ? [createSavedVideo({ status: 'ENDED' })] : [],
    )
    const { getVideos, fetcher } = createFetcher({})

    const changed = await refreshRecentTwitchVideos(createContext(fetcher))

    expect(changed).toBe(0)
    expect(getVideos).toHaveBeenCalledWith([])
    expect(supabase.requests).toHaveLength(1)
  })
})

describe('removeUnavailableTwitchVideos', () => {
  it('walks every video page by page and deletes the missing ones', async () => {
    const cursors: (string | undefined)[] = []
    supabase.respond(({ method, query, table }) => {
      if (method !== 'GET') {
        return table === 'videos' ? [{ id: 'video-2' }] : []
      }

      cursors.push(query['id'])

      if (query['id']) {
        return []
      }

      return [
        createSavedArchive(),
        createSavedArchive({
          id: 'video-2',
          thumbnail_id: 'thumb-2',
          twitch_video: {
            id: 'twitch-row-2',
            stream_id: null,
            twitch_video_id: 'clip-1',
            type: 'clip',
          },
        }),
        createSavedVideo({ id: 'video-3', status: 'ENDED' }),
      ]
    })
    const { getClips, getVideos, fetcher } = createFetcher({
      missingClipIds: ['clip-1'],
      videos: [createVideo()],
    })

    const changed = await removeUnavailableTwitchVideos(createContext(fetcher))

    expect(changed).toBeGreaterThan(0)
    expect(cursors).toEqual([undefined, 'gt.video-3'])
    expect(getVideos).toHaveBeenCalledWith(['vod-1'])
    expect(getClips).toHaveBeenCalledWith(['clip-1'])
    expect(supabase.written('PATCH', 'videos')).toEqual([
      expect.objectContaining({
        query: expect.objectContaining({ id: 'in.(video-2)' }),
      }),
    ])
    expect(supabase.requests[0]?.query).toMatchObject({
      order: 'id.asc',
      platform: 'eq.twitch',
      'talent.deleted_at': 'is.null',
    })
    expect(supabase.requests[0]?.query).not.toHaveProperty('talent.status')
  })

  it('reports no change when every video still exists', async () => {
    supabase.respond(({ method, query }) =>
      method === 'GET' && !query['id'] ? [createSavedArchive()] : [],
    )
    const { fetcher } = createFetcher({ videos: [createVideo()] })

    const changed = await removeUnavailableTwitchVideos(createContext(fetcher))

    expect(changed).toBe(0)
    expect(supabase.written('PATCH', 'videos')).toHaveLength(0)
  })
})
