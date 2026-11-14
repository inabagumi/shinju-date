import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountNotFoundError } from '../../internal/database/index.js'
import { TEST_NOW } from '../../internal/testing/context.js'
import { setupSupabase } from '../../internal/testing/supabase.js'
import {
  createSavedVideo,
  createStream,
  createVideo,
} from '../../internal/testing/twitch.js'
import { TwitchScraper } from '../scraper.js'
import type {
  TwitchApi,
  TwitchStream,
  TwitchUser,
  TwitchVideo,
  TwitchVideoPage,
} from '../types.js'

vi.mock('../../internal/thumbnails/index.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../internal/thumbnails/index.js')
  >()),
  createThumbnail: vi.fn(async () => ({ id: 'thumb-new', path: 'x/y.jpg' })),
  removeThumbnail: vi.fn(),
}))

const supabase = setupSupabase()

async function* fromArray<T>(items: readonly T[]): AsyncGenerator<T> {
  yield* items
}

interface FakeTwitch {
  archives?: TwitchVideo[]
  /** Pages of a broadcaster's history, keyed by the cursor they start at. */
  historyPages?: Record<string, TwitchVideoPage>
  liveStreams?: TwitchStream[]
  uploads?: TwitchVideo[]
  users?: TwitchUser[]
  /** Videos that still exist, looked up by ID. */
  videos?: TwitchVideo[]
}

/**
 * Stands in for Helix: the scraper is exercised through its public operations
 * with only Twitch and the database replaced.
 */
function createApi({
  archives = [],
  historyPages = {},
  liveStreams = [],
  uploads = [],
  users = [],
  videos = [],
}: FakeTwitch): TwitchApi {
  return {
    getClips: vi.fn(() => fromArray([])),
    getStreamsByUserIds: vi.fn(() => fromArray(liveStreams)),
    getUsers: vi.fn(({ ids }) =>
      fromArray(users.filter((user) => ids.includes(user.id))),
    ),
    getVideos: vi.fn(({ ids }) =>
      fromArray(videos.filter((video) => ids.includes(video.id))),
    ),
    getVideosByUser: vi.fn(({ type }) =>
      fromArray(type === 'upload' ? uploads : archives),
    ),
    getVideosByUserPage: vi.fn(
      async ({ after }) =>
        historyPages[after ?? ''] ?? { cursor: null, videos: [] },
    ),
  }
}

const activeTalents = [
  {
    id: 'talent-1',
    twitch_users: [{ id: 'user-row-1', twitch_user_id: 'twitch-user-1' }],
  },
]

describe('TwitchScraper', () => {
  const onError = vi.fn()

  function createScraper(fake: FakeTwitch) {
    const client = createApi(fake)

    return {
      client,
      scraper: new TwitchScraper({
        client,
        onError,
        supabaseClient: supabase.supabaseClient,
      }),
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('identifies its platform', () => {
    expect(createScraper({}).scraper.provider).toBe('twitch')
  })

  describe('refreshLiveVideos', () => {
    it('adds a LIVE row when a stream goes on air', async () => {
      supabase.respond(({ method, table }) =>
        method === 'GET' && table === 'talents' ? activeTalents : [],
      )
      const { scraper } = createScraper({ liveStreams: [createStream()] })

      await expect(scraper.refreshLiveVideos(TEST_NOW)).resolves.toBe(true)

      expect(supabase.written('POST', 'videos')[0]?.body).toMatchObject({
        platform: 'twitch',
        status: 'LIVE',
        talent_id: 'talent-1',
        thumbnail_id: 'thumb-new',
        title: 'Live now',
      })
      expect(supabase.written('POST', 'twitch_videos')[0]?.body).toMatchObject({
        stream_id: 'stream-1',
        twitch_user_id: 'user-row-1',
        twitch_video_id: 'live:stream-1',
        type: null,
      })
    })

    it('ends the row and takes over the archive when the stream goes offline', async () => {
      const { twitch_video, ...video } = createSavedVideo()

      supabase.respond(({ method, table }) => {
        if (method !== 'GET') {
          return []
        }

        switch (table) {
          case 'talents':
            return activeTalents
          case 'videos':
            return [
              {
                ...video,
                twitch_video: {
                  ...twitch_video,
                  twitch_user: { twitch_user_id: 'twitch-user-1' },
                },
              },
            ]
          default:
            return []
        }
      })
      const { scraper } = createScraper({ archives: [createVideo()] })

      await expect(scraper.refreshLiveVideos(TEST_NOW)).resolves.toBe(true)

      expect(supabase.written('PATCH', 'twitch_videos')[0]?.body).toEqual({
        twitch_video_id: 'vod-1',
        type: 'archive',
      })
      expect(supabase.written('PATCH', 'videos')[0]?.body).toMatchObject({
        duration: 'PT2H',
        status: 'ENDED',
        title: 'Archive',
      })
    })

    it('reports no change while nothing is on air', async () => {
      supabase.respond(({ method, table }) =>
        method === 'GET' && table === 'talents' ? activeTalents : [],
      )
      const { scraper } = createScraper({})

      await expect(scraper.refreshLiveVideos(TEST_NOW)).resolves.toBe(false)
    })
  })

  describe('addNewVideos', () => {
    it('saves archives and uploads that are not in the database yet', async () => {
      supabase.respond(({ method, table }) =>
        method === 'GET' && table === 'talents' ? activeTalents : [],
      )
      const { client, scraper } = createScraper({
        archives: [createVideo()],
        uploads: [
          createVideo({ id: 'upload-1', stream_id: null, type: 'upload' }),
        ],
      })

      await expect(scraper.addNewVideos(TEST_NOW)).resolves.toBe(true)

      expect(client.getVideosByUser).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'archive', userId: 'twitch-user-1' }),
      )
      expect(client.getVideosByUser).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'upload', userId: 'twitch-user-1' }),
      )
      expect(
        supabase
          .written('POST', 'twitch_videos')
          .map((request) => (request.body as { type: string }).type)
          .sort(),
      ).toEqual(['archive', 'upload'])
    })

    it('reports an account that cannot be read and handles the rest', async () => {
      const error = new Error('helix unavailable')
      supabase.respond(({ method, table }) =>
        method === 'GET' && table === 'talents' ? activeTalents : [],
      )
      const { client, scraper } = createScraper({})
      vi.mocked(client.getVideosByUser).mockImplementation(({ type }) => {
        if (type === 'upload') {
          throw error
        }

        return fromArray([createVideo()])
      })

      await expect(scraper.addNewVideos(TEST_NOW)).resolves.toBe(true)
      expect(onError).toHaveBeenCalledWith(error, {
        twitchUserId: 'twitch-user-1',
      })
    })
  })

  describe('refreshRecentVideos', () => {
    it('updates what changed on Twitch', async () => {
      supabase.respond(({ method }) =>
        method === 'GET'
          ? [
              createSavedVideo({
                duration: 'PT1H',
                status: 'ENDED',
                title: 'Archive',
                twitch_video: { twitch_video_id: 'vod-1', type: 'archive' },
              }),
            ]
          : [],
      )
      const { scraper } = createScraper({ videos: [createVideo()] })

      await expect(scraper.refreshRecentVideos(TEST_NOW)).resolves.toBe(true)

      expect(supabase.written('PATCH', 'videos')[0]?.body).toEqual({
        duration: 'PT2H',
        updated_at: '2024-05-01T12:00:00Z',
      })
    })
  })

  describe('removeUnavailableVideos', () => {
    it('soft-deletes videos Twitch no longer returns', async () => {
      supabase.respond(({ method, query, table }) => {
        if (method === 'GET') {
          return query['id']
            ? []
            : [
                createSavedVideo({
                  status: 'ENDED',
                  twitch_video: {
                    twitch_video_id: 'vod-gone',
                    type: 'archive',
                  },
                }),
              ]
        }

        return table === 'videos' ? [{ id: 'video-1' }] : []
      })
      const { scraper } = createScraper({})

      await expect(scraper.removeUnavailableVideos(TEST_NOW)).resolves.toBe(
        true,
      )
      expect(supabase.written('PATCH', 'videos')[0]?.body).toMatchObject({
        deleted_reason: 'unavailable',
      })
    })
  })

  describe('syncAccounts', () => {
    it('updates accounts whose name or login changed', async () => {
      supabase.respond(({ method }) =>
        method === 'GET'
          ? [
              {
                id: 'talent-1',
                twitch_users: [
                  {
                    id: 'user-row-1',
                    name: 'Alice',
                    twitch_login_name: 'alice_old',
                    twitch_user_id: 'twitch-user-1',
                  },
                ],
              },
            ]
          : [],
      )
      const { scraper } = createScraper({
        users: [
          {
            broadcaster_type: '',
            created_at: '2020-01-01T00:00:00Z',
            description: '',
            display_name: 'Alice',
            id: 'twitch-user-1',
            login: 'alice',
            offline_image_url: '',
            profile_image_url: '',
            type: '',
          },
        ],
      })

      await expect(scraper.syncAccounts()).resolves.toBe(true)

      expect(supabase.written('PATCH', 'twitch_users')[0]).toMatchObject({
        body: { name: 'Alice', twitch_login_name: 'alice' },
        query: { id: 'eq.user-row-1' },
      })
    })
  })

  describe('addPastVideos', () => {
    const twitchUserRow = {
      id: 'user-row-1',
      talent_id: 'talent-1',
      talents: { id: 'talent-1' },
      twitch_user_id: 'twitch-user-1',
    }

    it('saves the videos of one page that are not saved yet', async () => {
      supabase.respond(({ method, table }) => {
        if (method !== 'GET') {
          return []
        }

        if (table === 'twitch_users') {
          return [twitchUserRow]
        }

        // `vod-1` is saved already.
        if (table === 'twitch_videos') {
          const { twitch_video, ...video } = createSavedVideo({
            status: 'ENDED',
            twitch_video: { twitch_video_id: 'vod-1', type: 'archive' },
          })

          return [{ ...twitch_video, video }]
        }

        return []
      })
      const { client, scraper } = createScraper({
        historyPages: {
          '': {
            cursor: 'page-2',
            videos: [
              createVideo(),
              createVideo({ id: 'vod-2', stream_id: 'stream-2' }),
              createVideo({ id: 'highlight-1', type: 'highlight' }),
            ],
          },
        },
      })

      await expect(
        scraper.addPastVideos({ accountId: 'user-row-1', now: TEST_NOW }),
      ).resolves.toEqual({ added: 1, cursor: 'page-2', listed: 3 })

      expect(client.getVideosByUserPage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'all', userId: 'twitch-user-1' }),
      )
      expect(supabase.written('GET', 'twitch_users')[0]?.query).toMatchObject({
        id: 'eq.user-row-1',
        'talents.deleted_at': 'is.null',
      })
      expect(
        supabase
          .written('POST', 'twitch_videos')
          .map((request) => request.body),
      ).toEqual([
        expect.objectContaining({
          twitch_user_id: 'user-row-1',
          twitch_video_id: 'vod-2',
        }),
      ])
    })

    it('continues from the cursor and reports the end of the history', async () => {
      supabase.respond(({ method, table }) =>
        method === 'GET' && table === 'twitch_users' ? [twitchUserRow] : [],
      )
      const { client, scraper } = createScraper({
        historyPages: {
          'page-2': { cursor: null, videos: [] },
        },
      })

      await expect(
        scraper.addPastVideos({ accountId: 'user-row-1', cursor: 'page-2' }),
      ).resolves.toEqual({ added: 0, cursor: null, listed: 0 })

      expect(client.getVideosByUserPage).toHaveBeenCalledWith(
        expect.objectContaining({ after: 'page-2' }),
      )
      expect(client.getStreamsByUserIds).not.toHaveBeenCalled()
    })

    it('rejects an account that is unknown or whose talent was deleted', async () => {
      supabase.respond(() => [])
      const { client, scraper } = createScraper({})

      await expect(
        scraper.addPastVideos({ accountId: 'user-row-404' }),
      ).rejects.toBeInstanceOf(AccountNotFoundError)

      expect(client.getVideosByUserPage).not.toHaveBeenCalled()
    })
  })
})
