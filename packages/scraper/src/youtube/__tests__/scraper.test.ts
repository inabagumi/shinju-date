import type { youtube_v3 as youtube } from '@googleapis/youtube'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TEST_NOW } from '../../internal/testing/context.js'
import { setupSupabase } from '../../internal/testing/supabase.js'
import { YouTubeScraper } from '../scraper.js'

vi.mock('../../internal/thumbnails/index.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../internal/thumbnails/index.js')
  >()),
  createThumbnail: vi.fn(async () => ({ id: 'thumb-1', path: 'x/y.jpg' })),
  removeThumbnail: vi.fn(),
}))

const supabase = setupSupabase()

interface ListParams {
  id?: string[]
  part?: string[]
  playlistId?: string
}

interface FakeYouTube {
  /** Channel ID → title */
  channels?: Record<string, string>
  /** Channel ID → IDs in its uploads playlist, or an error to throw. */
  uploads?: Record<string, string[] | Error>
  /** Video ID → resource; IDs that are absent no longer exist. */
  videos?: Record<string, Partial<youtube.Schema$Video>>
}

/**
 * Stands in for the YouTube Data API: the scraper is exercised through its
 * public operations with only YouTube and the database replaced.
 */
function createClient({
  channels = {},
  uploads = {},
  videos = {},
}: FakeYouTube) {
  const videosList = vi.fn(async ({ id = [], part = [] }: ListParams) => ({
    data: {
      items: id
        .filter((value) => value in videos)
        .map((value) =>
          part.includes('snippet')
            ? {
                contentDetails: { duration: 'PT10M' },
                id: value,
                snippet: {
                  publishedAt: '2024-05-01T10:00:00Z',
                  title: `Video ${value}`,
                },
                ...videos[value],
              }
            : { id: value },
        ),
    },
  }))

  const client = {
    channels: {
      list: vi.fn(async ({ id = [] }: ListParams) => ({
        data: {
          items: id
            .filter((value) => value in channels)
            .map((value) => ({
              contentDetails: {
                relatedPlaylists: { uploads: `UU${value.slice(2)}` },
              },
              id: value,
              snippet: { customUrl: '@handle', title: channels[value] },
            })),
        },
      })),
    },
    playlistItems: {
      list: vi.fn(async ({ playlistId }: ListParams) => {
        const result = uploads[`UC${playlistId?.slice(2)}`] ?? []

        if (result instanceof Error) {
          throw result
        }

        return {
          data: {
            items: result.map((videoId) => ({ contentDetails: { videoId } })),
          },
        }
      }),
    },
    videos: { list: videosList },
  } as unknown as youtube.Youtube

  return { client, videosList }
}

const activeTalents = [
  {
    id: 'talent-1',
    youtube_channels: [{ id: 'channel-row-1', youtube_channel_id: 'UCaaa' }],
  },
  {
    id: 'talent-2',
    youtube_channels: [{ id: 'channel-row-2', youtube_channel_id: 'UCbbb' }],
  },
]

describe('YouTubeScraper', () => {
  const onError = vi.fn()

  function createScraper(fake: FakeYouTube) {
    const { client, videosList } = createClient(fake)

    return {
      scraper: new YouTubeScraper({
        client,
        onError,
        supabaseClient: supabase.supabaseClient,
      }),
      videosList,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('identifies its platform', () => {
    expect(createScraper({}).scraper.provider).toBe('youtube')
  })

  describe('addNewVideos', () => {
    it('saves uploads that are not in the database yet', async () => {
      supabase.respond(({ method, table }) => {
        if (method !== 'GET') {
          return []
        }

        return table === 'talents'
          ? activeTalents
          : [{ youtube_video_id: 'old-1' }]
      })
      const { scraper, videosList } = createScraper({
        channels: { UCaaa: 'Alice', UCbbb: 'Bob' },
        uploads: { UCaaa: ['new-1', 'old-1'] },
        videos: { 'new-1': {}, 'old-1': {} },
      })

      await expect(scraper.addNewVideos(TEST_NOW)).resolves.toBe(true)

      expect(videosList).toHaveBeenCalledTimes(1)
      expect(videosList).toHaveBeenCalledWith(
        expect.objectContaining({ id: ['new-1'] }),
      )
      expect(supabase.written('POST', 'videos')[0]?.body).toMatchObject({
        created_at: '2024-05-01T12:00:00Z',
        platform: 'youtube',
        talent_id: 'talent-1',
        thumbnail_id: null,
        title: 'Video new-1',
      })
      expect(supabase.written('POST', 'youtube_videos')[0]?.body).toMatchObject(
        { youtube_channel_id: 'channel-row-1', youtube_video_id: 'new-1' },
      )
    })

    it('reports nothing new without asking for video details', async () => {
      supabase.respond(({ method, table }) => {
        if (method !== 'GET') {
          return []
        }

        return table === 'talents'
          ? activeTalents
          : [{ youtube_video_id: 'old-1' }]
      })
      const { scraper, videosList } = createScraper({
        channels: { UCaaa: 'Alice', UCbbb: 'Bob' },
        uploads: { UCaaa: ['old-1'] },
      })

      await expect(scraper.addNewVideos(TEST_NOW)).resolves.toBe(false)
      expect(videosList).not.toHaveBeenCalled()
    })

    it('reports a channel that cannot be read and handles the others', async () => {
      const error = new Error('quota exceeded')
      supabase.respond(({ method, table }) =>
        method === 'GET' && table === 'talents' ? activeTalents : [],
      )
      const { scraper } = createScraper({
        channels: { UCaaa: 'Alice', UCbbb: 'Bob' },
        uploads: { UCaaa: error, UCbbb: ['b-1'] },
        videos: { 'b-1': {} },
      })

      await expect(scraper.addNewVideos(TEST_NOW)).resolves.toBe(true)
      expect(onError).toHaveBeenCalledWith(error, { youtubeChannelId: 'UCaaa' })
    })

    it('treats a channel without an uploads playlist as having no videos', async () => {
      supabase.respond(({ method, table }) =>
        method === 'GET' && table === 'talents' ? activeTalents : [],
      )
      const { scraper } = createScraper({
        channels: { UCaaa: 'Alice', UCbbb: 'Bob' },
        uploads: {
          UCaaa: Object.assign(new Error('playlistNotFound'), { status: 404 }),
        },
      })

      await expect(scraper.addNewVideos(TEST_NOW)).resolves.toBe(false)
      expect(onError).not.toHaveBeenCalled()
    })

    it('rejects when YouTube cannot be reached at all', async () => {
      supabase.respond(({ method, table }) =>
        method === 'GET' && table === 'talents' ? activeTalents : [],
      )
      const { client } = createClient({})
      vi.mocked(client.channels.list).mockRejectedValue(
        new Error('API key not valid') as never,
      )
      const scraper = new YouTubeScraper({
        client,
        supabaseClient: supabase.supabaseClient,
      })

      await expect(scraper.addNewVideos(TEST_NOW)).rejects.toThrow(
        'API key not valid',
      )
    })
  })

  describe('refreshLiveVideos', () => {
    const savedVideo = {
      duration: 'P0D',
      id: 'video-1',
      published_at: '2024-05-01T13:00:00+00:00',
      status: 'UPCOMING',
      thumbnail_id: 'thumb-1',
      title: 'Video yt-1',
      video_kind: 'standard',
      youtube_video: { youtube_video_id: 'yt-1' },
    }

    it('follows a scheduled video that went on air', async () => {
      supabase.respond(({ method }) => (method === 'GET' ? [savedVideo] : []))
      const { scraper } = createScraper({
        videos: {
          'yt-1': {
            contentDetails: {},
            liveStreamingDetails: {
              actualStartTime: '2024-05-01T11:59:00Z',
              scheduledStartTime: '2024-05-01T13:00:00Z',
            },
          },
        },
      })

      await expect(scraper.refreshLiveVideos(TEST_NOW)).resolves.toBe(true)

      expect(supabase.requests[0]?.query['status']).toBe('in.(UPCOMING,LIVE)')
      expect(supabase.written('PATCH', 'videos')[0]).toMatchObject({
        body: {
          published_at: '2024-05-01T11:59:00Z',
          status: 'LIVE',
          updated_at: '2024-05-01T12:00:00Z',
        },
        query: { id: 'eq.video-1' },
      })
    })

    it('soft-deletes a video YouTube no longer returns', async () => {
      supabase.respond(({ method, table }) => {
        if (method === 'GET') {
          return [savedVideo]
        }

        return table === 'videos' ? [{ id: 'video-1' }] : []
      })
      const { scraper } = createScraper({})

      await expect(scraper.refreshLiveVideos(TEST_NOW)).resolves.toBe(true)

      expect(supabase.written('PATCH', 'videos')[0]?.body).toMatchObject({
        deleted_reason: 'unavailable',
      })
      expect(supabase.written('PATCH', 'thumbnails')).toHaveLength(1)
    })

    it('reports no change when nothing is scheduled or on air', async () => {
      supabase.respond(() => [])
      const { scraper, videosList } = createScraper({})

      await expect(scraper.refreshLiveVideos(TEST_NOW)).resolves.toBe(false)
      expect(videosList).not.toHaveBeenCalled()
    })
  })

  describe('refreshRecentVideos', () => {
    it('re-reads the newest finished videos', async () => {
      supabase.respond(() => [])
      const { scraper } = createScraper({})

      await expect(scraper.refreshRecentVideos(TEST_NOW)).resolves.toBe(false)

      expect(supabase.requests[0]?.query).toMatchObject({
        limit: '100',
        status: 'in.(ENDED,PUBLISHED)',
      })
    })
  })

  describe('removeUnavailableVideos', () => {
    it('checks every video with ID-only requests and deletes the missing ones', async () => {
      supabase.respond(({ method, query, table }) => {
        if (method === 'GET') {
          return query['id']
            ? []
            : [
                {
                  id: 'video-1',
                  thumbnail_id: null,
                  youtube_video: { youtube_video_id: 'yt-1' },
                },
                {
                  id: 'video-2',
                  thumbnail_id: 'thumb-2',
                  youtube_video: { youtube_video_id: 'yt-gone' },
                },
              ]
        }

        return table === 'videos' ? [{ id: 'video-2' }] : []
      })
      const { scraper, videosList } = createScraper({ videos: { 'yt-1': {} } })

      await expect(scraper.removeUnavailableVideos(TEST_NOW)).resolves.toBe(
        true,
      )

      expect(videosList).toHaveBeenCalledWith(
        expect.objectContaining({ part: ['id'] }),
      )
      expect(supabase.written('PATCH', 'videos')[0]?.query['id']).toBe(
        'in.(video-2)',
      )
    })
  })

  describe('syncAccounts', () => {
    it('updates channels whose name or handle changed', async () => {
      supabase.respond(({ method }) =>
        method === 'GET'
          ? [
              {
                id: 'talent-1',
                youtube_channels: [
                  {
                    id: 'channel-row-1',
                    name: 'Old name',
                    youtube_channel_id: 'UCaaa',
                    youtube_handle: '@handle',
                  },
                ],
              },
            ]
          : [],
      )
      const { scraper } = createScraper({ channels: { UCaaa: 'Alice' } })

      await expect(scraper.syncAccounts()).resolves.toBe(true)

      expect(supabase.written('PATCH', 'youtube_channels')[0]).toMatchObject({
        body: { name: 'Alice', youtube_handle: '@handle' },
        query: { id: 'eq.channel-row-1' },
      })
    })
  })
})
