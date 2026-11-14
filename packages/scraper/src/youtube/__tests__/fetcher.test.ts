import type { youtube_v3 as youtube } from '@googleapis/youtube'
import { range } from '@shinju-date/helpers'
import { describe, expect, it, vi } from 'vitest'
import { YouTubeFetcher } from '../fetcher.js'

interface ListParams {
  id?: string[]
  maxResults?: number
  part?: string[]
  playlistId?: string
}

function createChannel(id: string): youtube.Schema$Channel {
  return {
    contentDetails: { relatedPlaylists: { uploads: `UU${id.slice(2)}` } },
    id,
    snippet: { title: `Channel ${id}` },
  }
}

function createVideo(id: string): youtube.Schema$Video {
  return {
    contentDetails: { duration: 'PT10M' },
    id,
    snippet: { publishedAt: '2024-01-01T00:00:00Z', title: `Video ${id}` },
  }
}

interface FakeYouTube {
  /** Channel ID → IDs in its uploads playlist, or an error to throw. */
  uploads?: Record<string, string[] | Error>
  /** IDs YouTube knows about; other requested IDs are omitted. */
  channelIds?: string[]
  videoIds?: string[]
}

function createClient({
  channelIds = [],
  uploads = {},
  videoIds = [],
}: FakeYouTube) {
  const channelsList = vi.fn(async ({ id = [] }: ListParams) => ({
    data: {
      items: id
        .filter((value) => channelIds.includes(value))
        .map(createChannel),
    },
  }))

  const playlistItemsList = vi.fn(async ({ playlistId }: ListParams) => {
    const channelId = `UC${playlistId?.slice(2)}`
    const result = uploads[channelId] ?? []

    if (result instanceof Error) {
      throw result
    }

    return {
      data: {
        items: result.map((videoId) => ({ contentDetails: { videoId } })),
      },
    }
  })

  const videosList = vi.fn(async ({ id = [], part = [] }: ListParams) => ({
    data: {
      items: id
        .filter((value) => videoIds.includes(value))
        .map((value) =>
          part.includes('snippet') ? createVideo(value) : { id: value },
        ),
    },
  }))

  const client = {
    channels: { list: channelsList },
    playlistItems: { list: playlistItemsList },
    videos: { list: videosList },
  } as unknown as youtube.Youtube

  return { channelsList, client, playlistItemsList, videosList }
}

function notFoundError(): Error {
  return Object.assign(new Error('The playlist cannot be found.'), {
    status: 404,
  })
}

describe('YouTubeFetcher', () => {
  it('identifies its platform', () => {
    expect(new YouTubeFetcher().provider).toBe('youtube')
  })

  describe('getAccounts', () => {
    it('returns the channels YouTube knows about', async () => {
      const { client } = createClient({ channelIds: ['UCaaa', 'UCbbb'] })
      const fetcher = new YouTubeFetcher({ client })

      const channels = await fetcher.getAccounts(['UCaaa', 'UCbbb', 'UCzzz'])

      expect(channels.map((channel) => channel.id)).toEqual(['UCaaa', 'UCbbb'])
    })

    it('requests each ID once in batches of 50', async () => {
      const ids = range(120).map((i) => `UC${i}`)
      const { channelsList, client } = createClient({ channelIds: ids })
      const fetcher = new YouTubeFetcher({ client })

      const channels = await fetcher.getAccounts([...ids, ...ids])

      expect(channels).toHaveLength(120)
      expect(channelsList).toHaveBeenCalledTimes(3)
    })

    it('does not call the API without IDs', async () => {
      const { channelsList, client } = createClient({})
      const fetcher = new YouTubeFetcher({ client })

      await expect(fetcher.getAccounts([])).resolves.toEqual([])
      expect(channelsList).not.toHaveBeenCalled()
    })
  })

  describe('getRecentVideoIds', () => {
    it('lists the newest uploads of each channel', async () => {
      const { client, playlistItemsList } = createClient({
        channelIds: ['UCaaa', 'UCbbb'],
        uploads: { UCaaa: ['a1', 'a2'], UCbbb: ['b1'] },
      })
      const fetcher = new YouTubeFetcher({ client })

      const result = await fetcher.getRecentVideoIds(['UCaaa', 'UCbbb'], {
        limit: 10,
      })

      expect(result).toEqual({
        accounts: [
          { accountId: 'UCaaa', videoIds: ['a1', 'a2'] },
          { accountId: 'UCbbb', videoIds: ['b1'] },
        ],
        failures: [],
        missingAccountIds: [],
      })
      expect(playlistItemsList).toHaveBeenCalledWith(
        expect.objectContaining({ maxResults: 10, playlistId: 'UUaaa' }),
      )
    })

    it('reports channels YouTube does not return', async () => {
      const { client } = createClient({ channelIds: ['UCaaa'] })
      const fetcher = new YouTubeFetcher({ client })

      const result = await fetcher.getRecentVideoIds(['UCaaa', 'UCgone'])

      expect(result.missingAccountIds).toEqual(['UCgone'])
    })

    it('keeps going when one channel fails', async () => {
      const error = new Error('quota exceeded')
      const { client } = createClient({
        channelIds: ['UCaaa', 'UCbbb'],
        uploads: { UCaaa: error, UCbbb: ['b1'] },
      })
      const logger = {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      }
      const fetcher = new YouTubeFetcher({ client, logger })

      const result = await fetcher.getRecentVideoIds(['UCaaa', 'UCbbb'])

      expect(result.accounts).toEqual([
        { accountId: 'UCbbb', videoIds: ['b1'] },
      ])
      expect(result.failures).toEqual([{ accountId: 'UCaaa', error }])
      expect(logger.error).toHaveBeenCalledTimes(1)
    })

    it('treats a missing uploads playlist as a channel without uploads', async () => {
      const { client } = createClient({
        channelIds: ['UCaaa'],
        uploads: { UCaaa: notFoundError() },
      })
      const fetcher = new YouTubeFetcher({ client })

      const result = await fetcher.getRecentVideoIds(['UCaaa'])

      expect(result.failures).toEqual([])
      expect(result.accounts).toEqual([{ accountId: 'UCaaa', videoIds: [] }])
    })
  })

  describe('getRecentVideos', () => {
    it('lists the newest uploads and fetches their details', async () => {
      const { client, videosList } = createClient({
        channelIds: ['UCaaa'],
        uploads: { UCaaa: ['a1', 'a2'] },
        videoIds: ['a1', 'a2'],
      })
      const fetcher = new YouTubeFetcher({ client })

      const result = await fetcher.getRecentVideos(['UCaaa', 'UCgone'])

      expect(result.videos.map((video) => video.id)).toEqual(['a1', 'a2'])
      expect(result.missingAccountIds).toEqual(['UCgone'])
      expect(result.failures).toEqual([])
      expect(videosList).toHaveBeenCalledTimes(1)
    })
  })

  describe('getVideos', () => {
    it('returns found videos and the IDs YouTube omitted', async () => {
      const { client } = createClient({ videoIds: ['v1', 'v3'] })
      const fetcher = new YouTubeFetcher({ client })

      const result = await fetcher.getVideos(['v1', 'v2', 'v3'])

      expect(result.videos.map((video) => video.id)).toEqual(['v1', 'v3'])
      expect(result.missingIds).toEqual(['v2'])
    })

    it('reports every ID as missing when YouTube returns nothing', async () => {
      const { client } = createClient({})
      const fetcher = new YouTubeFetcher({ client })

      const result = await fetcher.getVideos(['v1', 'v2'])

      expect(result).toEqual({ missingIds: ['v1', 'v2'], videos: [] })
    })

    it('batches large ID lists', async () => {
      const ids = range(120).map((i) => `v${i}`)
      const { client, videosList } = createClient({ videoIds: ids })
      const fetcher = new YouTubeFetcher({ client })

      const result = await fetcher.getVideos(ids)

      expect(result.videos).toHaveLength(120)
      expect(result.missingIds).toEqual([])
      expect(videosList).toHaveBeenCalledTimes(3)
    })

    it('never runs more requests than the concurrency limit', async () => {
      let running = 0
      let peak = 0
      const client = {
        videos: {
          list: vi.fn(async () => {
            running++
            peak = Math.max(peak, running)
            await new Promise((resolve) => setTimeout(resolve, 5))
            running--

            return { data: { items: [] } }
          }),
        },
      } as unknown as youtube.Youtube
      const fetcher = new YouTubeFetcher({ client, concurrency: 2 })

      await fetcher.getVideos(range(300).map((i) => `v${i}`))

      expect(peak).toBe(2)
    })

    it('rejects when a request fails', async () => {
      const client = {
        videos: { list: vi.fn().mockRejectedValue(new Error('boom')) },
      } as unknown as youtube.Youtube
      const fetcher = new YouTubeFetcher({ client })

      await expect(fetcher.getVideos(['v1'])).rejects.toThrow('boom')
    })
  })

  describe('findMissingVideoIds', () => {
    it('returns the IDs that no longer exist', async () => {
      const { client, videosList } = createClient({ videoIds: ['v1', 'v3'] })
      const fetcher = new YouTubeFetcher({ client })

      const missingIds = await fetcher.findMissingVideoIds(['v1', 'v2', 'v3'])

      expect(missingIds).toEqual(['v2'])
      expect(videosList).toHaveBeenCalledWith(
        expect.objectContaining({ part: ['id'] }),
      )
    })

    it('batches large ID lists', async () => {
      const ids = range(75).map((i) => `v${i}`)
      const { client, videosList } = createClient({
        videoIds: ids.slice(0, 70),
      })
      const fetcher = new YouTubeFetcher({ client })

      const missingIds = await fetcher.findMissingVideoIds(ids)

      expect(missingIds).toEqual(ids.slice(70))
      expect(videosList).toHaveBeenCalledTimes(2)
    })
  })
})
