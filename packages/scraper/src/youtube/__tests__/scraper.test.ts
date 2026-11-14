import type { youtube_v3 as youtube } from '@googleapis/youtube'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AccountNotFoundError,
  StalledPaginationError,
} from '../../internal/database/index.js'
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
  pageToken?: string
  part?: string[]
  playlistId?: string
}

interface FakeYouTube {
  /** Channel ID → title */
  channels?: Record<string, string>
  /**
   * `<channel ID>:<page token>` → one page of its uploads playlist. Takes
   * precedence over `uploads`.
   */
  uploadPages?: Record<string, { nextPageToken?: string; videoIds: string[] }>
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
  uploadPages = {},
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
      list: vi.fn(async ({ pageToken = '', playlistId }: ListParams) => {
        const channelId = `UC${playlistId?.slice(2)}`
        const page = uploadPages[`${channelId}:${pageToken}`]

        if (page) {
          return {
            data: {
              items: page.videoIds.map((videoId) => ({
                contentDetails: { videoId },
              })),
              nextPageToken: page.nextPageToken,
            },
          }
        }

        const result = uploads[channelId] ?? []

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

  return { client, playlistItemsList: client.playlistItems.list, videosList }
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
    const { client, playlistItemsList, videosList } = createClient(fake)

    return {
      playlistItemsList,
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

  describe('addPastVideos', () => {
    const channelRow = {
      id: 'channel-row-1',
      talent_id: 'talent-1',
      talents: { id: 'talent-1' },
      youtube_channel_id: 'UCaaa',
    }

    it('saves the videos of one page that are not saved yet', async () => {
      supabase.respond(({ method, table }) => {
        if (method !== 'GET') {
          return []
        }

        switch (table) {
          case 'youtube_channels':
            return [channelRow]
          case 'youtube_videos':
            return [{ youtube_video_id: 'saved' }]
          default:
            return []
        }
      })
      const { playlistItemsList, scraper, videosList } = createScraper({
        channels: { UCaaa: 'Channel A' },
        uploadPages: {
          'UCaaa:': { nextPageToken: 'page-2', videoIds: ['saved', 'old'] },
        },
        videos: { old: {}, saved: {} },
      })

      await expect(
        scraper.addPastVideos({ accountId: 'channel-row-1', now: TEST_NOW }),
      ).resolves.toEqual({ added: 1, cursor: 'page-2', listed: 2 })

      expect(playlistItemsList).toHaveBeenCalledWith(
        expect.objectContaining({ maxResults: 50, playlistId: 'UUaaa' }),
      )
      expect(videosList).toHaveBeenCalledWith(
        expect.objectContaining({ id: ['old'] }),
      )
      expect(
        supabase.written('GET', 'youtube_channels')[0]?.query,
      ).toMatchObject({
        id: 'eq.channel-row-1',
        'talents.deleted_at': 'is.null',
      })
      expect(supabase.written('POST', 'youtube_videos')).toEqual([
        expect.objectContaining({
          body: expect.objectContaining({
            youtube_channel_id: 'channel-row-1',
            youtube_video_id: 'old',
          }),
        }),
      ])
    })

    it('continues from the cursor and reports the end of the history', async () => {
      supabase.respond(({ method, table }) =>
        method === 'GET' && table === 'youtube_channels' ? [channelRow] : [],
      )
      const { playlistItemsList, scraper, videosList } = createScraper({
        channels: { UCaaa: 'Channel A' },
        uploadPages: { 'UCaaa:page-2': { videoIds: [] } },
      })

      await expect(
        scraper.addPastVideos({ accountId: 'channel-row-1', cursor: 'page-2' }),
      ).resolves.toEqual({ added: 0, cursor: null, listed: 0 })

      expect(playlistItemsList).toHaveBeenCalledWith(
        expect.objectContaining({ pageToken: 'page-2' }),
      )
      expect(videosList).not.toHaveBeenCalled()
    })

    it('rejects a page that does not move the cursor forward', async () => {
      supabase.respond(({ method, table }) =>
        method === 'GET' && table === 'youtube_channels' ? [channelRow] : [],
      )
      const { scraper, videosList } = createScraper({
        channels: { UCaaa: 'Channel A' },
        uploadPages: {
          'UCaaa:page-2': { nextPageToken: 'page-2', videoIds: ['old'] },
        },
        videos: { old: {} },
      })

      await expect(
        scraper.addPastVideos({ accountId: 'channel-row-1', cursor: 'page-2' }),
      ).rejects.toBeInstanceOf(StalledPaginationError)
      expect(videosList).not.toHaveBeenCalled()
    })

    it('rejects a channel YouTube does not know', async () => {
      supabase.respond(({ method, table }) =>
        method === 'GET' && table === 'youtube_channels' ? [channelRow] : [],
      )
      const { playlistItemsList, scraper } = createScraper({})

      await expect(
        scraper.addPastVideos({ accountId: 'channel-row-1' }),
      ).rejects.toBeInstanceOf(AccountNotFoundError)

      expect(playlistItemsList).not.toHaveBeenCalled()
    })

    it('rejects a channel whose talent was deleted', async () => {
      supabase.respond(() => [])
      const { scraper } = createScraper({ channels: { UCaaa: 'Channel A' } })

      await expect(
        scraper.addPastVideos({ accountId: 'channel-row-1' }),
      ).rejects.toBeInstanceOf(AccountNotFoundError)
    })
  })
})
