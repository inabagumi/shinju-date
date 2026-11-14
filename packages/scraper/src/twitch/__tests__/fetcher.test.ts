import type {
  TwitchClip,
  TwitchStream,
  TwitchUser,
  TwitchVideo,
} from '@shinju-date/twitch-api-client'
import { describe, expect, it, vi } from 'vitest'
import { TwitchFetcher } from '../fetcher.js'
import type { TwitchApi } from '../types.js'

function stream(id: string, userId = 'user-1'): TwitchStream {
  return {
    game_id: '1',
    game_name: 'Game',
    id,
    is_mature: false,
    language: 'ja',
    started_at: '2023-01-01T00:00:00Z',
    tags: [],
    thumbnail_url: 'https://example.com/{width}x{height}.jpg',
    title: `Stream ${id}`,
    type: 'live',
    user_id: userId,
    user_login: 'alice',
    user_name: 'Alice',
    viewer_count: 42,
  }
}

function createClient(overrides: Partial<TwitchApi> = {}): TwitchApi {
  return {
    getClips: vi.fn(() => fromArray<TwitchClip>([])),
    getStreamsByUserIds: vi.fn(() => fromArray<TwitchStream>([])),
    getUsers: vi.fn(() => fromArray<TwitchUser>([])),
    getVideos: vi.fn(() => fromArray<TwitchVideo>([])),
    getVideosByUser: vi.fn(() => fromArray<TwitchVideo>([])),
    getVideosByUserPage: vi.fn(async () => ({ cursor: null, videos: [] })),
    ...overrides,
  }
}

function video(id: string, userId = 'user-1'): TwitchVideo {
  return {
    created_at: '2023-01-01T00:00:00Z',
    description: '',
    duration: 'PT1H0M0S',
    id,
    language: 'ja',
    published_at: '2023-01-01T00:00:00Z',
    stream_id: null,
    thumbnail_url: 'https://example.com/t.jpg',
    title: `Video ${id}`,
    type: 'archive',
    url: `https://www.twitch.tv/videos/${id}`,
    user_id: userId,
    user_login: 'alice',
    user_name: 'Alice',
    view_count: 1,
    viewable: 'public',
  }
}

function user(id: string): TwitchUser {
  return {
    broadcaster_type: 'affiliate',
    created_at: '2020-01-01T00:00:00Z',
    description: '',
    display_name: `User ${id}`,
    id,
    login: `user_${id}`,
    offline_image_url: '',
    profile_image_url: '',
    type: '',
  }
}

function clip(id: string): TwitchClip {
  return {
    broadcaster_id: 'user-1',
    broadcaster_name: 'Alice',
    created_at: '2023-01-01T00:00:00Z',
    creator_id: 'user-2',
    creator_name: 'Bob',
    duration: 'PT30S',
    embed_url: '',
    game_id: '1',
    id,
    language: 'ja',
    thumbnail_url: 'https://example.com/c.jpg',
    title: `Clip ${id}`,
    url: `https://clips.twitch.tv/${id}`,
    video_id: 'v1',
    view_count: 1,
    vod_offset: 0,
  }
}

async function* fromArray<T>(items: T[]): AsyncGenerator<T, void, undefined> {
  for (const item of items) {
    yield item
  }
}

describe('TwitchFetcher', () => {
  it('identifies its platform', () => {
    expect(new TwitchFetcher({ client: createClient() }).provider).toBe(
      'twitch',
    )
  })

  describe('getAccounts', () => {
    it('returns the users Helix knows about', async () => {
      const getUsers = vi.fn(({ ids }: { ids: string[] }) =>
        fromArray(ids.filter((id) => id !== 'gone').map(user)),
      )
      const fetcher = new TwitchFetcher({ client: createClient({ getUsers }) })

      const users = await fetcher.getAccounts(['1', 'gone', '2'])

      expect(users.map((value) => value.id)).toEqual(['1', '2'])
    })

    it('requests each ID once in batches of 100', async () => {
      const ids = Array.from({ length: 150 }, (_, i) => `${i}`)
      const getUsers = vi.fn(({ ids }: { ids: string[] }) =>
        fromArray(ids.map(user)),
      )
      const fetcher = new TwitchFetcher({ client: createClient({ getUsers }) })

      const users = await fetcher.getAccounts([...ids, ...ids])

      expect(users).toHaveLength(150)
      expect(getUsers).toHaveBeenCalledTimes(2)
    })

    it('does not call Helix without IDs', async () => {
      const client = createClient()
      const fetcher = new TwitchFetcher({ client })

      await expect(fetcher.getAccounts([])).resolves.toEqual([])
      expect(client.getUsers).not.toHaveBeenCalled()
    })
  })

  describe('getLiveStreams', () => {
    it('returns the streams that are live', async () => {
      const getStreamsByUserIds = vi.fn(() => fromArray([stream('s1')]))
      const fetcher = new TwitchFetcher({
        client: createClient({ getStreamsByUserIds }),
      })

      const streams = await fetcher.getLiveStreams(['user-1', 'user-2'])

      expect(streams.map((value) => value.id)).toEqual(['s1'])
      expect(getStreamsByUserIds).toHaveBeenCalledWith({
        userIds: ['user-1', 'user-2'],
      })
    })
  })

  describe('getRecentVideos', () => {
    it('lists archives of every broadcaster by default', async () => {
      const getVideosByUser = vi.fn(({ userId }: { userId: string }) =>
        fromArray([video(`${userId}-v1`, userId)]),
      )
      const fetcher = new TwitchFetcher({
        client: createClient({ getVideosByUser }),
      })

      const result = await fetcher.getRecentVideos(['user-1', 'user-2'])

      expect(result.failures).toEqual([])
      expect(result.missingAccountIds).toEqual([])
      expect(result.videos.map((value) => value.id)).toEqual([
        'user-1-v1',
        'user-2-v1',
      ])
      expect(getVideosByUser).toHaveBeenCalledWith({
        limit: 20,
        type: 'archive',
        userId: 'user-1',
      })
    })

    it('passes the requested type and limit', async () => {
      const getVideosByUser = vi.fn(() => fromArray<TwitchVideo>([]))
      const fetcher = new TwitchFetcher({
        client: createClient({ getVideosByUser }),
      })

      await fetcher.getRecentVideos(['user-1'], { limit: 5, type: 'upload' })

      expect(getVideosByUser).toHaveBeenCalledWith({
        limit: 5,
        type: 'upload',
        userId: 'user-1',
      })
    })

    it('keeps going when one broadcaster fails', async () => {
      const error = new Error('helix unavailable')
      const getVideosByUser = vi.fn(({ userId }: { userId: string }) => {
        if (userId === 'user-1') {
          throw error
        }

        return fromArray([video('v2', userId)])
      })
      const logger = {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      }
      const fetcher = new TwitchFetcher({
        client: createClient({ getVideosByUser }),
        logger,
      })

      const result = await fetcher.getRecentVideos(['user-1', 'user-2'])

      expect(result.videos.map((value) => value.id)).toEqual(['v2'])
      expect(result.failures).toEqual([{ accountId: 'user-1', error }])
      expect(logger.error).toHaveBeenCalledTimes(1)
    })

    it('never runs more requests than the concurrency limit', async () => {
      let running = 0
      let peak = 0
      const getVideosByUser = vi.fn(async function* () {
        running++
        peak = Math.max(peak, running)
        await new Promise((resolve) => setTimeout(resolve, 5))
        running--
        yield* [] as TwitchVideo[]
      })
      const fetcher = new TwitchFetcher({
        client: createClient({ getVideosByUser }),
        concurrency: 2,
      })

      await fetcher.getRecentVideos(['1', '2', '3', '4', '5', '6'])

      expect(peak).toBe(2)
    })
  })

  describe('getRecentVideoIds', () => {
    it('lists the IDs of the newest videos per broadcaster', async () => {
      const getVideosByUser = vi.fn(({ userId }: { userId: string }) =>
        fromArray(userId === 'user-1' ? [video('v1'), video('v2')] : []),
      )
      const fetcher = new TwitchFetcher({
        client: createClient({ getVideosByUser }),
      })

      const result = await fetcher.getRecentVideoIds(['user-1', 'user-2'], {
        type: 'upload',
      })

      expect(result).toEqual({
        accounts: [
          { accountId: 'user-1', videoIds: ['v1', 'v2'] },
          { accountId: 'user-2', videoIds: [] },
        ],
        failures: [],
        missingAccountIds: [],
      })
      expect(getVideosByUser).toHaveBeenCalledWith({
        limit: 20,
        type: 'upload',
        userId: 'user-1',
      })
    })
  })

  describe('findMissingVideoIds', () => {
    it('returns the IDs Helix no longer knows', async () => {
      const getVideos = vi.fn(({ ids }: { ids: string[] }) =>
        fromArray(ids.filter((id) => id !== 'gone').map((id) => video(id))),
      )
      const fetcher = new TwitchFetcher({ client: createClient({ getVideos }) })

      await expect(
        fetcher.findMissingVideoIds(['v1', 'gone']),
      ).resolves.toEqual(['gone'])
    })
  })

  describe('getVideos', () => {
    it('returns found videos and the IDs Helix omitted', async () => {
      const getVideos = vi.fn(({ ids }: { ids: string[] }) =>
        fromArray(ids.filter((id) => id !== 'gone').map((id) => video(id))),
      )
      const fetcher = new TwitchFetcher({ client: createClient({ getVideos }) })

      const result = await fetcher.getVideos(['v1', 'gone', 'v2'])

      expect(result.videos.map((value) => value.id)).toEqual(['v1', 'v2'])
      expect(result.missingIds).toEqual(['gone'])
    })

    it('rejects when a request fails', async () => {
      const getVideos = vi.fn(() => {
        throw new Error('boom')
      })
      const fetcher = new TwitchFetcher({ client: createClient({ getVideos }) })

      await expect(fetcher.getVideos(['v1'])).rejects.toThrow('boom')
    })
  })

  describe('getClips', () => {
    it('returns found clips and the IDs Helix omitted', async () => {
      const getClips = vi.fn(({ ids }: { ids: string[] }) =>
        fromArray(ids.filter((id) => id !== 'gone').map(clip)),
      )
      const fetcher = new TwitchFetcher({ client: createClient({ getClips }) })

      const result = await fetcher.getClips(['c1', 'gone'])

      expect(result.clips.map((value) => value.id)).toEqual(['c1'])
      expect(result.missingIds).toEqual(['gone'])
    })
  })
})
