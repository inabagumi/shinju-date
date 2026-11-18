import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestContext } from '../internal/testing/context.js'
import { createFakeFetcher } from '../internal/testing/fetcher.js'
import {
  alreadySaved,
  newVideoId,
  postgresError,
  setupSupabase,
} from '../internal/testing/supabase.js'
import { createVideo, YOUTUBE_TALENTS } from '../internal/testing/youtube.js'
import {
  createThumbnail,
  removeThumbnail,
} from '../internal/thumbnails/index.js'
import { addNewYouTubeVideos } from './add-new-videos.js'
import type { YouTubeFetcher } from './fetcher.js'

vi.mock('../internal/thumbnails/index.js', () => ({
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

describe('addNewYouTubeVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createThumbnail).mockResolvedValue({
      id: 'thumb-1',
      path: 'new-1/x.jpg',
    })
  })

  it('adds the videos that are not saved yet', async () => {
    supabase.respondWith({
      'GET talents': YOUTUBE_TALENTS,
      'GET youtube_videos': [{ youtube_video_id: 'old-1' }],
    })
    const { getRecentVideos, getVideos, fetcher } =
      createFakeFetcher<YouTubeFetcher>({
        recentVideos: [
          { channelId: 'UCaaa', videoId: 'new-1' },
          { channelId: 'UCaaa', videoId: 'old-1' },
        ],
        videos: [createVideo({ id: 'new-1' })],
      })

    const added = await addNewYouTubeVideos(createContext(fetcher))

    expect(added).toBe(1)
    expect(getRecentVideos).toHaveBeenCalledWith(['UCaaa', 'UCbbb'])
    expect(getVideos).toHaveBeenCalledWith(['new-1'])

    const [inserted] = supabase.insertedVideos()

    expect(inserted?.video).toEqual({
      created_at: '2024-05-01T12:00:00Z',
      duration: 'PT10M',
      platform: 'youtube',
      published_at: '2024-05-01T10:00:00Z',
      status: 'PUBLISHED',
      talent_id: 'talent-1',
      thumbnail_id: 'thumb-1',
      title: 'Video new-1',
      updated_at: '2024-05-01T12:00:00Z',
      video_kind: 'standard',
      visible: true,
    })
    expect(inserted?.platform).toBe('youtube')
    expect(inserted?.platformVideo).toEqual({
      youtube_channel_id: 'channel-row-1',
      youtube_video_id: 'new-1',
    })
    expect(createThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: 'new-1',
        source: {
          height: 720,
          url: 'https://i.ytimg.test/new-1.jpg',
          width: 1280,
        },
      }),
    )
  })

  it('links each video to the channel it was uploaded to', async () => {
    supabase.respondWith({ 'GET talents': YOUTUBE_TALENTS })
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      recentVideos: [
        { channelId: 'UCaaa', videoId: 'a-1' },
        { channelId: 'UCbbb', videoId: 'b-1' },
      ],
      videos: [createVideo({ id: 'a-1' }), createVideo({ id: 'b-1' })],
    })

    await addNewYouTubeVideos(createContext(fetcher))

    expect(
      supabase
        .insertedVideos()
        .map(({ platformVideo }) => platformVideo)
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          youtube_channel_id: 'channel-row-1',
          youtube_video_id: 'a-1',
        }),
        expect.objectContaining({
          youtube_channel_id: 'channel-row-2',
          youtube_video_id: 'b-1',
        }),
      ]),
    )
  })

  it('does not request video details when nothing is new', async () => {
    supabase.respondWith({
      'GET talents': YOUTUBE_TALENTS,
      'GET youtube_videos': [{ youtube_video_id: 'old-1' }],
    })
    const { getVideos, fetcher } = createFakeFetcher<YouTubeFetcher>({
      recentVideos: [{ channelId: 'UCaaa', videoId: 'old-1' }],
    })

    const added = await addNewYouTubeVideos(createContext(fetcher))

    expect(added).toBe(0)
    expect(getVideos).not.toHaveBeenCalled()
    expect(supabase.insertedVideos()).toHaveLength(0)
  })

  it('still adds a video whose thumbnail cannot be stored', async () => {
    const error = new Error('image host is down')
    vi.mocked(createThumbnail).mockRejectedValue(error)
    supabase.respondWith({ 'GET talents': YOUTUBE_TALENTS })
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      recentVideos: [{ channelId: 'UCaaa', videoId: 'new-1' }],
      videos: [createVideo({ id: 'new-1' })],
    })

    const added = await addNewYouTubeVideos(createContext(fetcher))

    expect(added).toBe(1)
    expect(supabase.insertedVideos()[0]?.video).toMatchObject({
      thumbnail_id: null,
    })
    expect(reportError).toHaveBeenCalledWith(error, { youtubeVideoId: 'new-1' })
  })

  it('discards its thumbnail when another run saved the video first', async () => {
    supabase.respondWith({
      'GET talents': YOUTUBE_TALENTS,
      'POST rpc/insert_video': () => alreadySaved(),
    })
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      recentVideos: [{ channelId: 'UCaaa', videoId: 'new-1' }],
      videos: [createVideo({ id: 'new-1' })],
    })

    const added = await addNewYouTubeVideos(createContext(fetcher))

    expect(added).toBe(0)
    expect(removeThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({ supabaseClient: supabase.supabaseClient }),
      {
        id: 'thumb-1',
        path: 'new-1/x.jpg',
      },
    )
    expect(reportError).not.toHaveBeenCalled()
  })

  it('keeps adding the other videos when one cannot be saved', async () => {
    supabase.respondWith({
      'GET talents': YOUTUBE_TALENTS,
      'POST rpc/insert_video': ({ body }) =>
        (body as { p_video: { title: string } }).p_video.title === 'Video bad-1'
          ? postgresError('23502', 'null value in column')
          : newVideoId(),
    })
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      recentVideos: [
        { channelId: 'UCaaa', videoId: 'bad-1' },
        { channelId: 'UCaaa', videoId: 'new-1' },
      ],
      videos: [createVideo({ id: 'bad-1' }), createVideo({ id: 'new-1' })],
    })

    const added = await addNewYouTubeVideos(createContext(fetcher))

    expect(added).toBe(1)
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('null value in column'),
      }),
      { youtubeVideoId: 'bad-1' },
    )
    expect(removeThumbnail).toHaveBeenCalledTimes(1)
  })

  it('reports channels that could not be read and handles the rest', async () => {
    const error = new Error('quota exceeded')
    supabase.respondWith({ 'GET talents': YOUTUBE_TALENTS })
    const { fetcher } = createFakeFetcher<YouTubeFetcher>({
      failures: [{ accountId: 'UCaaa', error }],
      recentVideos: [{ channelId: 'UCbbb', videoId: 'b-1' }],
      videos: [createVideo({ id: 'b-1' })],
    })

    const added = await addNewYouTubeVideos(createContext(fetcher))

    expect(added).toBe(1)
    expect(reportError).toHaveBeenCalledWith(error, {
      youtubeChannelId: 'UCaaa',
    })
  })

  it('does not call YouTube when no channel is registered', async () => {
    supabase.respond(() => [])
    const { getRecentVideos, fetcher } = createFakeFetcher<YouTubeFetcher>()

    const added = await addNewYouTubeVideos(createContext(fetcher))

    expect(added).toBe(0)
    expect(getRecentVideos).not.toHaveBeenCalled()
  })

  it('fails when the channels cannot be loaded', async () => {
    supabase.respond(() => postgresError('42501', 'permission denied'))
    const { fetcher } = createFakeFetcher<YouTubeFetcher>()

    await expect(addNewYouTubeVideos(createContext(fetcher))).rejects.toThrow(
      'permission denied',
    )
  })
})
