import type { youtube_v3 as youtube } from '@googleapis/youtube'
import { describe, expect, it, vi } from 'vitest'
import {
  getPlaylistItemsPage,
  getVideoIds,
  parseYouTubeChannelIdentifier,
  type RequestScheduler,
  YOUTUBE_DATA_API_MAX_RESULTS,
  YouTubeChannelSchema,
  YouTubeChannelSnippetSchema,
  YouTubePlaylistItemSchema,
  YouTubeVideoSchema,
} from './index.js'

describe('YouTube API Client', () => {
  describe('constants', () => {
    it('should export YOUTUBE_DATA_API_MAX_RESULTS', () => {
      expect(YOUTUBE_DATA_API_MAX_RESULTS).toBe(50)
    })
  })

  describe('parseYouTubeChannelIdentifier', () => {
    const channelId = 'UCabcdefghijklmnopqrstuv'

    it('parses a bare channel ID', () => {
      expect(parseYouTubeChannelIdentifier(channelId)).toEqual({
        id: channelId,
        kind: 'id',
      })
    })

    it('parses a channel URL', () => {
      expect(
        parseYouTubeChannelIdentifier(
          `https://www.youtube.com/channel/${channelId}`,
        ),
      ).toEqual({ id: channelId, kind: 'id' })
      expect(
        parseYouTubeChannelIdentifier(
          `youtube.com/channel/${channelId}/videos`,
        ),
      ).toEqual({ id: channelId, kind: 'id' })
    })

    it('parses a handle with and without @', () => {
      expect(parseYouTubeChannelIdentifier('@example_handle')).toEqual({
        handle: 'example_handle',
        kind: 'handle',
      })
      expect(parseYouTubeChannelIdentifier('example_handle')).toEqual({
        handle: 'example_handle',
        kind: 'handle',
      })
    })

    it('parses a handle URL', () => {
      expect(
        parseYouTubeChannelIdentifier(
          'https://www.youtube.com/@example_handle',
        ),
      ).toEqual({ handle: 'example_handle', kind: 'handle' })
      expect(
        parseYouTubeChannelIdentifier(
          'https://youtube.com/@example_handle/videos',
        ),
      ).toEqual({ handle: 'example_handle', kind: 'handle' })
    })

    it('parses legacy /c/ and /user/ URLs as handles', () => {
      expect(
        parseYouTubeChannelIdentifier('https://www.youtube.com/c/ExampleName'),
      ).toEqual({ handle: 'ExampleName', kind: 'handle' })
      expect(
        parseYouTubeChannelIdentifier(
          'https://www.youtube.com/user/ExampleUser',
        ),
      ).toEqual({ handle: 'ExampleUser', kind: 'handle' })
    })

    it('returns null for empty or invalid input', () => {
      expect(parseYouTubeChannelIdentifier('')).toBeNull()
      expect(parseYouTubeChannelIdentifier('   ')).toBeNull()
      expect(parseYouTubeChannelIdentifier('ab')).toBeNull()
      expect(parseYouTubeChannelIdentifier('not a channel!!!')).toBeNull()
      expect(
        parseYouTubeChannelIdentifier('https://example.com/foo'),
      ).toBeNull()
    })
  })

  describe('YouTubeChannelSnippetSchema', () => {
    it('should validate a snippet with title only', () => {
      expect(() =>
        YouTubeChannelSnippetSchema.parse({ title: 'Test Channel' }),
      ).not.toThrow()
    })

    it('should validate a snippet with title and customUrl', () => {
      expect(() =>
        YouTubeChannelSnippetSchema.parse({
          customUrl: '@testchannel',
          title: 'Test Channel',
        }),
      ).not.toThrow()
    })

    it('should reject a snippet without title', () => {
      expect(() => YouTubeChannelSnippetSchema.parse({})).toThrow()
    })
  })

  describe('YouTubeChannelSchema', () => {
    it('should validate a valid channel', () => {
      const validChannel = {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UU12345',
          },
        },
        id: 'UC12345',
        snippet: {
          customUrl: '@testchannel',
          title: 'Test Channel',
        },
      }
      expect(() => YouTubeChannelSchema.parse(validChannel)).not.toThrow()
    })

    it('should validate a channel without customUrl', () => {
      const validChannel = {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UU12345',
          },
        },
        id: 'UC12345',
        snippet: {
          title: 'Test Channel',
        },
      }
      expect(() => YouTubeChannelSchema.parse(validChannel)).not.toThrow()
    })

    it('should reject a channel without id', () => {
      const invalidChannel = {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UU12345',
          },
        },
        snippet: {
          title: 'Test Channel',
        },
      }
      expect(() => YouTubeChannelSchema.parse(invalidChannel)).toThrow()
    })

    it('should reject a channel without uploads playlist', () => {
      const invalidChannel = {
        contentDetails: {
          relatedPlaylists: {},
        },
        id: 'UC12345',
        snippet: {
          title: 'Test Channel',
        },
      }
      expect(() => YouTubeChannelSchema.parse(invalidChannel)).toThrow()
    })

    it('should reject a channel without snippet title', () => {
      const invalidChannel = {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UU12345',
          },
        },
        id: 'UC12345',
        snippet: {},
      }
      expect(() => YouTubeChannelSchema.parse(invalidChannel)).toThrow()
    })

    it('should reject a channel without snippet', () => {
      const invalidChannel = {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UU12345',
          },
        },
        id: 'UC12345',
      }
      expect(() => YouTubeChannelSchema.parse(invalidChannel)).toThrow()
    })
  })

  describe('YouTubePlaylistItemSchema', () => {
    it('should validate a valid playlist item', () => {
      const validItem = {
        contentDetails: {
          videoId: 'dQw4w9WgXcQ',
        },
      }
      expect(() => YouTubePlaylistItemSchema.parse(validItem)).not.toThrow()
    })

    it('should reject a playlist item without videoId', () => {
      const invalidItem = {
        contentDetails: {},
      }
      expect(() => YouTubePlaylistItemSchema.parse(invalidItem)).toThrow()
    })
  })

  describe('YouTubeVideoSchema', () => {
    it('should validate a valid video', () => {
      const validVideo = {
        contentDetails: {},
        id: 'dQw4w9WgXcQ',
        snippet: {
          publishedAt: '2009-10-25T06:57:33Z',
        },
      }
      expect(() => YouTubeVideoSchema.parse(validVideo)).not.toThrow()
    })

    it('should reject a video without id', () => {
      const invalidVideo = {
        contentDetails: {},
        snippet: {
          publishedAt: '2009-10-25T06:57:33Z',
        },
      }
      expect(() => YouTubeVideoSchema.parse(invalidVideo)).toThrow()
    })

    it('should reject a video without publishedAt', () => {
      const invalidVideo = {
        contentDetails: {},
        id: 'dQw4w9WgXcQ',
        snippet: {},
      }
      expect(() => YouTubeVideoSchema.parse(invalidVideo)).toThrow()
    })
  })

  describe('getPlaylistItemsPage', () => {
    function createClient(data: youtube.Schema$PlaylistItemListResponse) {
      const list = vi.fn(async () => ({ data }))

      return {
        client: { playlistItems: { list } } as unknown as youtube.Youtube,
        list,
      }
    }

    it('returns one page with the token of the next', async () => {
      const { client, list } = createClient({
        items: [
          { contentDetails: { videoId: 'a' } },
          { contentDetails: {} },
          { contentDetails: { videoId: 'b' } },
        ],
        nextPageToken: 'next',
      })

      const page = await getPlaylistItemsPage({
        client,
        pageToken: 'current',
        playlistID: 'UUxxx',
      })

      expect(list).toHaveBeenCalledWith({
        maxResults: 50,
        pageToken: 'current',
        part: ['contentDetails'],
        playlistId: 'UUxxx',
      })
      expect(page.items.map((item) => item.contentDetails.videoId)).toEqual([
        'a',
        'b',
      ])
      expect(page.nextPageToken).toBe('next')
    })

    it('reports the last page', async () => {
      const { client, list } = createClient({ items: [] })

      await expect(
        getPlaylistItemsPage({ client, playlistID: 'UUxxx' }),
      ).resolves.toEqual({ items: [], nextPageToken: null })
      expect(list).toHaveBeenCalledWith(
        expect.not.objectContaining({ pageToken: expect.anything() }),
      )
    })
  })

  describe('lookups by ID', () => {
    function createClient() {
      let running = 0
      let peak = 0
      const list = vi.fn(async ({ id = [] }: { id?: string[] }) => {
        running++
        peak = Math.max(peak, running)
        await new Promise((resolve) => setTimeout(resolve, 5))
        running--

        return { data: { items: id.map((value) => ({ id: value })) } }
      })

      return {
        client: { videos: { list } } as unknown as youtube.Youtube,
        list,
        peak: () => peak,
      }
    }

    async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
      const items: T[] = []

      for await (const item of iterable) {
        items.push(item)
      }

      return items
    }

    const ids = Array.from({ length: 120 }, (_, i) => `v${i}`)

    it('requests the IDs in batches, one after another by default', async () => {
      const { client, list, peak } = createClient()

      await expect(collect(getVideoIds({ client, ids }))).resolves.toEqual(ids)
      expect(list.mock.calls.map(([{ id }]) => id)).toEqual([
        ids.slice(0, 50),
        ids.slice(50, 100),
        ids.slice(100),
      ])
      expect(peak()).toBe(1)
    })

    it('hands every batch to the scheduler and keeps their order', async () => {
      const { client, list, peak } = createClient()
      let scheduled = 0
      const schedule: RequestScheduler = (request) => {
        scheduled++

        return request()
      }

      await expect(
        collect(getVideoIds({ client, ids, schedule })),
      ).resolves.toEqual(ids)
      expect(scheduled).toBe(3)
      expect(list).toHaveBeenCalledTimes(3)
      expect(peak()).toBe(3)
    })

    it('makes no request without IDs', async () => {
      const { client, list } = createClient()

      await expect(collect(getVideoIds({ client, ids: [] }))).resolves.toEqual(
        [],
      )
      expect(list).not.toHaveBeenCalled()
    })
  })
})
