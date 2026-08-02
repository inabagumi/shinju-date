import type {
  TwitchClip,
  TwitchUser,
  TwitchVideo,
} from '@shinju-date/twitch-api-client'
import { describe, expect, it, vi } from 'vitest'
import { TwitchScraper } from '../scraper.js'
import type { TwitchScraperClient } from '../types.js'

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

describe('TwitchScraper', () => {
  it('scrapeUsers invokes callback with fetched users', async () => {
    const client: TwitchScraperClient = {
      getClips: vi.fn(),
      getUsers: vi.fn().mockReturnValue(fromArray([user('1'), user('2')])),
      getVideos: vi.fn(),
      getVideosByUser: vi.fn(),
    }

    await using scraper = new TwitchScraper({ client })
    const onUsers = vi.fn()

    await scraper.scrapeUsers({ userIds: ['1', '2'] }, onUsers)

    expect(onUsers).toHaveBeenCalledTimes(1)
    expect(onUsers).toHaveBeenCalledWith([
      expect.objectContaining({ id: '1' }),
      expect.objectContaining({ id: '2' }),
    ])
  })

  it('scrapeNewVideos calls back per user with videos', async () => {
    const client: TwitchScraperClient = {
      getClips: vi.fn(),
      getUsers: vi.fn(),
      getVideos: vi.fn(),
      getVideosByUser: vi.fn().mockImplementation(({ userId }) => {
        if (userId === 'u1') {
          return fromArray([video('v1', 'u1')])
        }
        return fromArray([])
      }),
    }

    await using scraper = new TwitchScraper({ client, concurrency: 1 })
    const onNew = vi.fn()

    await scraper.scrapeNewVideos({ userIds: ['u1', 'u2'] }, onNew)

    expect(onNew).toHaveBeenCalledTimes(1)
    expect(onNew).toHaveBeenCalledWith('u1', [
      expect.objectContaining({ id: 'v1' }),
    ])
  })

  it('scrapeNewVideos continues when one user fails', async () => {
    const logger = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }
    const client: TwitchScraperClient = {
      getClips: vi.fn(),
      getUsers: vi.fn(),
      getVideos: vi.fn(),
      getVideosByUser: vi.fn().mockImplementation(({ userId }) => {
        if (userId === 'u-fail') {
          return {
            [Symbol.asyncIterator]() {
              return {
                next() {
                  return Promise.reject(new Error('helix down'))
                },
              }
            },
          } as AsyncGenerator<TwitchVideo, void, undefined>
        }
        return fromArray([video('v-ok', userId)])
      }),
    }

    await using scraper = new TwitchScraper({
      client,
      concurrency: 1,
      logger,
    })
    const onNew = vi.fn()

    await scraper.scrapeNewVideos({ userIds: ['u-fail', 'u-ok'] }, onNew)

    expect(onNew).toHaveBeenCalledTimes(1)
    expect(onNew).toHaveBeenCalledWith('u-ok', [
      expect.objectContaining({ id: 'v-ok' }),
    ])
    expect(logger.error).toHaveBeenCalled()
  })

  it('scrapeVideosAvailability marks missing IDs unavailable', async () => {
    const client: TwitchScraperClient = {
      getClips: vi.fn().mockReturnValue(fromArray([clip('c1')])),
      getUsers: vi.fn(),
      getVideos: vi.fn().mockReturnValue(fromArray([video('v1')])),
      getVideosByUser: vi.fn(),
    }

    await using scraper = new TwitchScraper({ client })
    const results: { id: string; isAvailable: boolean }[] = []

    await scraper.scrapeVideosAvailability(
      { clipIds: ['c1', 'c-missing'], videoIds: ['v1', 'v-missing'] },
      async (batch) => {
        results.push(...batch)
      },
    )

    expect(results).toEqual(
      expect.arrayContaining([
        { id: 'v1', isAvailable: true },
        { id: 'v-missing', isAvailable: false },
        { id: 'c1', isAvailable: true },
        { id: 'c-missing', isAvailable: false },
      ]),
    )
  })

  it('skips empty id lists without calling the client', async () => {
    const client: TwitchScraperClient = {
      getClips: vi.fn(),
      getUsers: vi.fn(),
      getVideos: vi.fn(),
      getVideosByUser: vi.fn(),
    }

    await using scraper = new TwitchScraper({ client })
    const onVideos = vi.fn()

    await scraper.scrapeVideos({ ids: [] }, onVideos)

    expect(client.getVideos).not.toHaveBeenCalled()
    expect(onVideos).not.toHaveBeenCalled()
  })
})
