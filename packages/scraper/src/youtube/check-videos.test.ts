import { HttpResponse, http } from 'msw'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestContext } from '../internal/testing/context.js'
import { createFakeFetcher } from '../internal/testing/fetcher.js'
import {
  createImage,
  mockStorage,
  serveImage,
} from '../internal/testing/images.js'
import { postgresError, setupSupabase } from '../internal/testing/supabase.js'
import { createSavedVideo, createVideo } from '../internal/testing/youtube.js'
import {
  refreshYouTubeVideos,
  removeUnavailableYouTubeVideos,
} from './check-videos.js'
import type { YouTubeFetcher } from './fetcher.js'

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

/** The `liveStreamingDetails` of a stream scheduled for 13:00. */
const scheduled = {
  contentDetails: {},
  liveStreamingDetails: { scheduledStartTime: '2024-05-01T13:00:00Z' },
}

describe('refreshYouTubeVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads scheduled and live videos of active talents by default', async () => {
    supabase.respond(() => [])
    const { getVideos, fetcher } = createFakeFetcher<YouTubeFetcher>()

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
    const { fetcher } = createFakeFetcher<YouTubeFetcher>()

    await refreshYouTubeVideos(createContext(fetcher), 'recent')

    expect(supabase.requests[0]?.query).toMatchObject({
      limit: '100',
      order: 'published_at.desc',
      status: 'in.(ENDED,PUBLISHED)',
    })
  })

  it('updates only the videos that changed, and only what changed', async () => {
    supabase.respond(({ method }) =>
      method === 'GET' ? [createSavedVideo('a'), createSavedVideo('b')] : [],
    )
    const { getVideos, fetcher } = createFakeFetcher<YouTubeFetcher>({
      videos: [
        createVideo({ ...scheduled, id: 'a' }),
        createVideo({
          ...scheduled,
          id: 'b',
          liveStreamingDetails: {
            actualStartTime: '2024-05-01T11:58:00Z',
            scheduledStartTime: '2024-05-01T13:00:00Z',
          },
        }),
      ],
    })

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

  it('deletes videos YouTube no longer returns', async () => {
    supabase.respond(({ method, table }) => {
      if (method === 'GET') {
        return [createSavedVideo('a'), createSavedVideo('gone')]
      }

      return table === 'rpc/soft_delete_videos' ? ['video-gone'] : []
    })
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      missingVideoIds: ['gone'],
      videos: [createVideo({ ...scheduled, id: 'a' })],
    })

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'live')

    expect(changed).toBeGreaterThan(0)
    // `soft_delete_videos` deletes the thumbnails with the videos.
    expect(supabase.written('POST', 'rpc/soft_delete_videos')).toEqual([
      expect.objectContaining({
        body: {
          p_deleted_at: '2024-05-01T12:00:00Z',
          p_reason: 'unavailable',
          p_video_ids: ['video-gone'],
        },
      }),
    ])
    expect(supabase.written('PATCH', 'videos')).toHaveLength(0)
    expect(supabase.written('PATCH', 'thumbnails')).toHaveLength(0)
  })

  it('deletes the videos even when YouTube returns none of them', async () => {
    supabase.respond(({ method, table }) => {
      if (method === 'GET') {
        return [createSavedVideo('gone', { thumbnail_id: null })]
      }

      return table === 'rpc/soft_delete_videos' ? ['video-gone'] : []
    })
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      missingVideoIds: ['gone'],
    })

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'live')

    expect(changed).toBeGreaterThan(0)
    expect(supabase.written('POST', 'rpc/soft_delete_videos')).toHaveLength(1)
  })

  it('reports a video that could not be updated and handles the rest', async () => {
    supabase.respond(({ method, query }) => {
      if (method === 'GET') {
        return [createSavedVideo('a'), createSavedVideo('b')]
      }

      return query['id'] === 'eq.video-a'
        ? postgresError('40001', 'could not serialize access')
        : []
    })
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      videos: [
        createVideo({
          ...scheduled,
          id: 'a',
          snippet: { publishedAt: '2024-04-30T00:00:00Z', title: 'Renamed a' },
        }),
        createVideo({
          ...scheduled,
          id: 'b',
          snippet: { publishedAt: '2024-04-30T00:00:00Z', title: 'Renamed b' },
        }),
      ],
    })

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
      method === 'GET' ? [createSavedVideo('a')] : [],
    )
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      videos: [createVideo({ ...scheduled, id: 'a' })],
    })

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'live')

    expect(changed).toBe(0)
    expect(supabase.requests).toHaveLength(1)
  })
})

describe('refreshYouTubeVideos and thumbnails', () => {
  const IMAGE_URL = 'https://i.ytimg.test/a.jpg'
  const thumbnail = { etag: '"etag-1"', id: 'thumb-a', path: 'a/old.jpg' }
  const finished = {
    contentDetails: { duration: 'PT1H' },
    liveStreamingDetails: {
      actualEndTime: '2024-05-01T11:00:00Z',
      actualStartTime: '2024-05-01T10:00:00Z',
      scheduledStartTime: '2024-05-01T10:00:00Z',
    },
  }

  let image: Buffer

  beforeAll(async () => {
    image = await createImage(32, 18)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fills in the thumbnail of a video saved without one', async () => {
    const storage = mockStorage(supabase, 'thumbnails')
    const requests = serveImage(supabase, IMAGE_URL, { body: image })
    supabase.respond(({ method }) =>
      method === 'GET'
        ? [
            createSavedVideo('a', {
              duration: 'PT1H',
              published_at: '2024-05-01T10:00:00+00:00',
              status: 'ENDED',
              thumbnail_id: null,
            }),
          ]
        : [],
    )
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      videos: [createVideo({ ...finished, id: 'a' })],
    })

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'recent')

    expect(changed).toBe(1)
    expect(requests).toEqual([{ ifNoneMatch: null, url: IMAGE_URL }])
    expect(storage.uploads.map(({ path }) => path)).toEqual([
      expect.stringMatching(/^a\//),
    ])
    const inserted = supabase.written('POST', 'thumbnails')[0]?.body

    expect(inserted).toMatchObject({ etag: '"etag-1"' })
    expect(supabase.written('PATCH', 'videos')).toEqual([
      expect.objectContaining({
        body: {
          thumbnail_id: (inserted as { id: string }).id,
          updated_at: '2024-05-01T12:00:00Z',
        },
        query: { id: 'eq.video-a' },
      }),
    ])
    expect(reportError).not.toHaveBeenCalled()
  })

  it('replaces the thumbnail of a scheduled video and keeps the old one', async () => {
    const storage = mockStorage(supabase, 'thumbnails')
    const requests = serveImage(supabase, IMAGE_URL, {
      body: image,
      etag: '"etag-2"',
    })
    supabase.respond(({ method }) =>
      method === 'GET' ? [createSavedVideo('a', { thumbnail })] : [],
    )
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      videos: [createVideo({ ...scheduled, id: 'a' })],
    })

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'live')

    expect(changed).toBe(1)
    expect(requests).toEqual([{ ifNoneMatch: '"etag-1"', url: IMAGE_URL }])
    expect(storage.uploads).toHaveLength(1)
    const inserted = supabase.written('POST', 'thumbnails')[0]?.body

    expect(inserted).toMatchObject({ etag: '"etag-2"' })
    expect(supabase.written('PATCH', 'videos')).toEqual([
      expect.objectContaining({
        body: {
          thumbnail_id: (inserted as { id: string }).id,
          updated_at: '2024-05-01T12:00:00Z',
        },
      }),
    ])
    // The old thumbnail is left for the cleanup of unused thumbnails.
    expect(supabase.written('PATCH', 'thumbnails')).toEqual([
      expect.objectContaining({
        body: { updated_at: '2024-05-01T12:00:00Z' },
        query: { id: 'eq.thumb-a' },
      }),
    ])
    expect(supabase.written('DELETE', 'thumbnails')).toHaveLength(0)
    expect(storage.removed).toHaveLength(0)
  })

  it('also follows the thumbnail of a live video', async () => {
    mockStorage(supabase, 'thumbnails')
    serveImage(supabase, IMAGE_URL, { body: image, etag: '"etag-2"' })
    supabase.respond(({ method }) =>
      method === 'GET'
        ? [
            createSavedVideo('a', {
              published_at: '2024-05-01T11:58:00+00:00',
              status: 'LIVE',
              thumbnail,
            }),
          ]
        : [],
    )
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      videos: [
        createVideo({
          ...scheduled,
          id: 'a',
          liveStreamingDetails: {
            actualStartTime: '2024-05-01T11:58:00Z',
            scheduledStartTime: '2024-05-01T13:00:00Z',
          },
        }),
      ],
    })

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'live')

    expect(changed).toBe(1)
    expect(supabase.written('POST', 'thumbnails')).toHaveLength(1)
  })

  it('does not download again a thumbnail that is not modified', async () => {
    const storage = mockStorage(supabase, 'thumbnails')
    const requests = serveImage(supabase, IMAGE_URL, { body: image })
    supabase.respond(({ method }) =>
      method === 'GET' ? [createSavedVideo('a', { thumbnail })] : [],
    )
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      videos: [createVideo({ ...scheduled, id: 'a' })],
    })

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'live')

    expect(changed).toBe(0)
    expect(requests).toEqual([{ ifNoneMatch: '"etag-1"', url: IMAGE_URL }])
    expect(storage.uploads).toHaveLength(0)
    expect(supabase.requests).toHaveLength(1)
  })

  it('does not download a thumbnail without an ETag to compare with', async () => {
    const requests = serveImage(supabase, IMAGE_URL, { body: image })
    supabase.respond(({ method }) =>
      method === 'GET'
        ? [createSavedVideo('a', { thumbnail: { ...thumbnail, etag: null } })]
        : [],
    )
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      videos: [createVideo({ ...scheduled, id: 'a' })],
    })

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'live')

    expect(changed).toBe(0)
    expect(requests).toHaveLength(0)
  })

  it('does not download the thumbnails of finished videos and uploads', async () => {
    const requests = serveImage(supabase, IMAGE_URL, {
      body: image,
      etag: '"etag-2"',
    })
    supabase.respond(({ method }) =>
      method === 'GET'
        ? [
            createSavedVideo('a', {
              duration: 'PT1H',
              published_at: '2024-05-01T10:00:00+00:00',
              status: 'ENDED',
              thumbnail,
            }),
            createSavedVideo('b', {
              duration: 'PT10M',
              published_at: '2024-05-01T10:00:00+00:00',
              status: 'PUBLISHED',
            }),
          ]
        : [],
    )
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      videos: [createVideo({ ...finished, id: 'a' }), createVideo({ id: 'b' })],
    })

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'recent')

    expect(changed).toBe(0)
    expect(requests).toHaveLength(0)
    expect(supabase.requests).toHaveLength(1)
  })

  it('stops following the thumbnail of a stream once it ended', async () => {
    const requests = serveImage(supabase, IMAGE_URL, {
      body: image,
      etag: '"etag-2"',
    })
    supabase.respond(({ method }) =>
      method === 'GET'
        ? [createSavedVideo('a', { status: 'LIVE', thumbnail })]
        : [],
    )
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      videos: [createVideo({ ...finished, id: 'a' })],
    })

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'live')

    expect(changed).toBe(1)
    expect(requests).toHaveLength(0)
    expect(supabase.written('PATCH', 'videos')[0]?.body).toMatchObject({
      status: 'ENDED',
    })
  })

  it('reports a thumbnail that cannot be downloaded and refreshes the rest', async () => {
    mockStorage(supabase, 'thumbnails')
    supabase.server.use(
      http.get(IMAGE_URL, () => new HttpResponse('Not Found', { status: 404 })),
    )
    serveImage(supabase, 'https://i.ytimg.test/b.jpg', { body: image })
    supabase.respond(({ method }) =>
      method === 'GET'
        ? [
            createSavedVideo('a', { thumbnail_id: null }),
            createSavedVideo('b', { thumbnail_id: null }),
          ]
        : [],
    )
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      videos: [
        createVideo({ ...scheduled, id: 'a' }),
        createVideo({ ...scheduled, id: 'b' }),
      ],
    })

    const changed = await refreshYouTubeVideos(createContext(fetcher), 'live')

    expect(changed).toBe(1)
    expect(reportError).toHaveBeenCalledTimes(1)
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Failed to download an image'),
      }),
      { youtubeVideoId: 'a' },
    )
    expect(supabase.written('PATCH', 'videos')).toEqual([
      expect.objectContaining({ query: { id: 'eq.video-b' } }),
    ])
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
    const { findMissingVideoIds, fetcher } = createFakeFetcher<YouTubeFetcher>()

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

      return table === 'rpc/soft_delete_videos' ? ['video-0001'] : []
    })
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      missingVideoIds: ['yt-0001'],
    })

    const changed = await removeUnavailableYouTubeVideos(createContext(fetcher))

    expect(changed).toBeGreaterThan(0)
    expect(
      supabase.written('POST', 'rpc/soft_delete_videos')[0]?.body,
    ).toMatchObject({ p_video_ids: ['video-0001'] })
  })

  it('does not call YouTube when there are no videos', async () => {
    supabase.respond(() => [])
    const { findMissingVideoIds, fetcher } = createFakeFetcher<YouTubeFetcher>()

    const changed = await removeUnavailableYouTubeVideos(createContext(fetcher))

    expect(changed).toBe(0)
    expect(findMissingVideoIds).not.toHaveBeenCalled()
  })
})
