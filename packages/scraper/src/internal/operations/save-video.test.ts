import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TalentAccount } from '../database/index.js'
import { createTestContext } from '../testing/context.js'
import { createImage, mockStorage, serveImage } from '../testing/images.js'
import { postgresError, setupSupabase } from '../testing/supabase.js'
import { createThumbnail, THUMBNAILS_BUCKET } from '../thumbnails/thumbnail.js'
import { type NewVideoAdapter, saveVideoWithThumbnail } from './save-video.js'

interface FakeVideo {
  id: string
  /** `null` when the platform has no thumbnail yet. */
  thumbnailUrl: string | null
  title: string
}

const supabase = setupSupabase()
const reportError = vi.fn()
const context = createTestContext({
  fetcher: null,
  reportError,
  supabaseClient: supabase.supabaseClient,
})

const account: TalentAccount = {
  id: 'channel-row-1',
  platformId: 'UCaaa',
  talentId: 'talent-1',
}

const adapter: NewVideoAdapter<FakeVideo> = {
  createThumbnail: ({ now, supabaseClient }, video) =>
    video.thumbnailUrl
      ? createThumbnail({
          folder: video.id,
          now,
          source: { height: 720, url: video.thumbnailUrl, width: 1280 },
          supabaseClient,
        })
      : Promise.resolve(null),
  toFields: (video) => ({
    duration: 'PT10M',
    published_at: '2024-05-01T10:00:00Z',
    status: 'PUBLISHED',
    title: video.title,
    video_kind: 'standard',
  }),
  toPlatformVideo: (video, channel) => ({
    platform: 'youtube',
    values: { youtube_channel_id: channel.id, youtube_video_id: video.id },
  }),
}

const THUMBNAIL_URL = 'https://img.example.test/video-1.jpg'

function createFakeVideo(overrides: Partial<FakeVideo> = {}): FakeVideo {
  return {
    id: 'video-1',
    thumbnailUrl: THUMBNAIL_URL,
    title: 'Video 1',
    ...overrides,
  }
}

interface Row {
  id: string
  path?: string
  thumbnail_id?: string | null
}

/**
 * Keeps the rows written to `videos`, `youtube_videos` and `thumbnails`, and
 * rejects a second `youtube_videos` row for the same platform video ID like
 * the unique constraint does.
 */
function mockDatabase() {
  const rows = {
    thumbnails: new Map<string, Row>(),
    videos: new Map<string, Row>(),
    /** `video_id` of each `youtube_videos` row, by `youtube_video_id`. */
    youtubeVideos: new Map<string, string>(),
  }

  supabase.respond(({ body, method, query, table }) => {
    const id = query['id']?.replace(/^eq\./, '')

    switch (`${method} ${table}`) {
      case 'POST thumbnails':
        rows.thumbnails.set((body as Row).id, body as Row)
        return []
      case 'DELETE thumbnails':
        if (id) rows.thumbnails.delete(id)
        return []
      case 'POST videos':
        rows.videos.set((body as Row).id, body as Row)
        return []
      case 'DELETE videos':
        if (id) rows.videos.delete(id)
        return []
      case 'POST youtube_videos': {
        const { video_id, youtube_video_id } = body as {
          video_id: string
          youtube_video_id: string
        }

        if (rows.youtubeVideos.has(youtube_video_id)) {
          return postgresError('23505', 'duplicate key value')
        }

        rows.youtubeVideos.set(youtube_video_id, video_id)
        return []
      }
      default:
        return []
    }
  })

  return rows
}

describe('saveVideoWithThumbnail', () => {
  let image: Buffer

  beforeAll(async () => {
    image = await createImage(1280, 720)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts the video with its platform row and its thumbnail', async () => {
    const rows = mockDatabase()
    const storage = mockStorage(supabase, THUMBNAILS_BUCKET)
    serveImage(supabase, THUMBNAIL_URL, { body: image })

    await expect(
      saveVideoWithThumbnail(context, adapter, createFakeVideo(), account),
    ).resolves.toBe(true)

    const [thumbnail] = [...rows.thumbnails.values()]
    const video = supabase.written('POST', 'videos')[0]?.body as Row

    expect(storage.uploads).toEqual([
      expect.objectContaining({ path: expect.stringMatching(/^video-1\//) }),
    ])
    expect(video).toEqual({
      created_at: '2024-05-01T12:00:00Z',
      duration: 'PT10M',
      id: expect.any(String),
      platform: 'youtube',
      published_at: '2024-05-01T10:00:00Z',
      status: 'PUBLISHED',
      talent_id: 'talent-1',
      thumbnail_id: thumbnail?.id,
      title: 'Video 1',
      updated_at: '2024-05-01T12:00:00Z',
      video_kind: 'standard',
      visible: true,
    })
    expect(supabase.written('POST', 'youtube_videos')[0]?.body).toEqual({
      video_id: video.id,
      youtube_channel_id: 'channel-row-1',
      youtube_video_id: 'video-1',
    })
    expect(reportError).not.toHaveBeenCalled()
  })

  it('inserts the video without a thumbnail when the platform has none', async () => {
    const rows = mockDatabase()
    const storage = mockStorage(supabase, THUMBNAILS_BUCKET)

    await expect(
      saveVideoWithThumbnail(
        context,
        adapter,
        createFakeVideo({ thumbnailUrl: null }),
        account,
      ),
    ).resolves.toBe(true)

    expect(storage.uploads).toHaveLength(0)
    expect(rows.thumbnails.size).toBe(0)
    expect(supabase.written('POST', 'videos')[0]?.body).toMatchObject({
      thumbnail_id: null,
    })
  })

  it('saves a video once and leaves no thumbnail behind when two runs save it at once', async () => {
    const rows = mockDatabase()
    const storage = mockStorage(supabase, THUMBNAILS_BUCKET)
    serveImage(supabase, THUMBNAIL_URL, { body: image })

    const results = await Promise.all([
      saveVideoWithThumbnail(context, adapter, createFakeVideo(), account),
      saveVideoWithThumbnail(context, adapter, createFakeVideo(), account),
    ])

    expect(results.sort()).toEqual([false, true])

    // Each run stored a thumbnail; the run that lost removed its own.
    const [video] = [...rows.videos.values()]
    const kept = rows.thumbnails.get(video?.thumbnail_id ?? '')
    const uploadedPaths = storage.uploads.map((upload) => upload.path)

    expect(rows.videos.size).toBe(1)
    // The video that is left is the one its platform row points at.
    expect(rows.youtubeVideos).toEqual(new Map([['video-1', video?.id]]))
    expect(rows.thumbnails.size).toBe(1)
    expect(uploadedPaths).toHaveLength(2)
    expect(uploadedPaths).toContain(kept?.path)
    expect(storage.removed).toEqual([
      uploadedPaths.filter((path) => path !== kept?.path),
    ])
    expect(reportError).not.toHaveBeenCalled()
  })

  it('removes the thumbnail and rethrows when the video cannot be inserted', async () => {
    const storage = mockStorage(supabase, THUMBNAILS_BUCKET)
    serveImage(supabase, THUMBNAIL_URL, { body: image })
    supabase.respondWith({
      'POST videos': () => postgresError('23502', 'null value in column'),
    })

    await expect(
      saveVideoWithThumbnail(context, adapter, createFakeVideo(), account),
    ).rejects.toThrow('null value in column')

    expect(supabase.written('DELETE', 'thumbnails')).toHaveLength(1)
    expect(storage.removed).toEqual([[storage.uploads[0]?.path]])
    expect(reportError).not.toHaveBeenCalled()
  })
})
