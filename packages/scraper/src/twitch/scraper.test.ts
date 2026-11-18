import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AccountNotFoundError,
  StalledPaginationError,
} from '../internal/errors.js'
import { TEST_NOW } from '../internal/testing/context.js'
import {
  newVideoId,
  postgresError,
  setupSupabase,
} from '../internal/testing/supabase.js'
import {
  createClip,
  createSavedVideo,
  createStream,
  createVideo,
  findSavedVideos,
  isSavedVideoLookup,
  TWITCH_TALENTS,
} from '../internal/testing/twitch.js'
import type { SavedTwitchVideo } from './saved-video.js'
import { TwitchScraper } from './scraper.js'
import type {
  TwitchApi,
  TwitchClip,
  TwitchStream,
  TwitchUser,
  TwitchVideo,
  TwitchVideoPage,
} from './types.js'

vi.mock('../internal/thumbnails/index.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../internal/thumbnails/index.js')>()),
  createThumbnail: vi.fn(async () => ({ id: 'thumb-new', path: 'x/y.jpg' })),
  removeThumbnail: vi.fn(),
}))

const supabase = setupSupabase()

async function* fromArray<T>(items: readonly T[]): AsyncGenerator<T> {
  yield* items
}

interface FakeTwitch {
  archives?: TwitchVideo[]
  /** Clips that still exist, looked up by ID. */
  clips?: TwitchClip[]
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
  clips = [],
  historyPages = {},
  liveStreams = [],
  uploads = [],
  users = [],
  videos = [],
}: FakeTwitch): TwitchApi {
  return {
    getClips: vi.fn(({ ids }) =>
      fromArray(clips.filter((clip) => ids.includes(clip.id))),
    ),
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

/**
 * Answers like a database holding one saved video: reads return the row as it
 * is after the writes made so far. Requests named in `failing` (e.g.
 * `PATCH twitch_videos`) fail instead.
 */
function respondWithSavedVideo(
  initial: SavedTwitchVideo,
  { failing = [] }: { failing?: string[] } = {},
) {
  let row = structuredClone(initial)

  supabase.respond((request) => {
    const { body, method, table } = request
    const { twitch_video, ...video } = row
    const route = `${method} ${table}`

    if (failing.includes(route)) {
      return postgresError('57014', 'canceling statement due to timeout')
    }

    switch (route) {
      case 'GET talents':
        return TWITCH_TALENTS
      case 'GET videos':
        if (isSavedVideoLookup(request)) {
          return findSavedVideos([row])(request)
        }

        return [
          {
            ...video,
            twitch_video: {
              ...twitch_video,
              twitch_user: { twitch_user_id: 'twitch-user-1' },
            },
          },
        ]
      case 'PATCH videos':
        row = { ...row, ...(body as Partial<SavedTwitchVideo>) }
        return [{ id: row.id }]
      case 'PATCH twitch_videos':
        row = {
          ...row,
          twitch_video: {
            ...twitch_video,
            ...(body as Partial<SavedTwitchVideo['twitch_video']>),
          },
        }
        return []
      case 'POST rpc/soft_delete_videos':
        return (body as { p_video_ids: string[] }).p_video_ids
      default:
        return []
    }
  })
}

/** The writes made so far, without the reads. */
function writes() {
  return supabase.requests.filter(({ method }) => method !== 'GET')
}

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
      supabase.respondWith({ 'GET talents': TWITCH_TALENTS })
      const { scraper } = createScraper({ liveStreams: [createStream()] })

      await expect(scraper.refreshLiveVideos(TEST_NOW)).resolves.toBe(true)

      expect(supabase.insertedVideos()[0]?.video).toMatchObject({
        platform: 'twitch',
        status: 'LIVE',
        talent_id: 'talent-1',
        thumbnail_id: 'thumb-new',
        title: 'Live now',
      })
      expect(supabase.insertedVideos()[0]?.platformVideo).toMatchObject({
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
            return TWITCH_TALENTS
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
        method === 'GET' && table === 'talents' ? TWITCH_TALENTS : [],
      )
      const { scraper } = createScraper({})

      await expect(scraper.refreshLiveVideos(TEST_NOW)).resolves.toBe(false)
    })
  })

  describe('addNewVideos', () => {
    it('saves archives and uploads that are not in the database yet', async () => {
      supabase.respondWith({ 'GET talents': TWITCH_TALENTS })
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
          .insertedVideos()
          .map(({ platformVideo }) => (platformVideo as { type: string }).type)
          .sort(),
      ).toEqual(['archive', 'upload'])
    })

    it('reports an account that cannot be read and handles the rest', async () => {
      const error = new Error('helix unavailable')
      supabase.respondWith({ 'GET talents': TWITCH_TALENTS })
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

  describe('refreshVideo', () => {
    const endedArchive = createSavedVideo({
      duration: 'PT1H',
      status: 'ENDED',
      thumbnail_id: 'thumb-1',
      title: 'Archive',
      twitch_video: { twitch_video_id: 'vod-1', type: 'archive' },
    })

    it('updates what changed and reports the changed columns', async () => {
      respondWithSavedVideo(endedArchive)
      const { scraper } = createScraper({
        videos: [createVideo({ title: 'Renamed archive' })],
      })

      await expect(scraper.refreshVideo('video-1', TEST_NOW)).resolves.toEqual({
        after: { duration: 'PT2H', title: 'Renamed archive' },
        before: { duration: 'PT1H', title: 'Archive' },
        status: 'updated',
        title: 'Renamed archive',
      })

      expect(supabase.written('GET', 'videos')[0]?.query).toMatchObject({
        deleted_at: 'is.null',
        id: 'eq.video-1',
        platform: 'eq.twitch',
      })
      expect(onError).not.toHaveBeenCalled()
    })

    it('writes the same values as the scheduled refresh', async () => {
      const fake = { videos: [createVideo({ title: 'Renamed archive' })] }

      respondWithSavedVideo(endedArchive)
      await createScraper(fake).scraper.refreshVideo('video-1', TEST_NOW)
      const single = writes()

      supabase.requests.length = 0
      respondWithSavedVideo(endedArchive)
      await createScraper(fake).scraper.refreshRecentVideos(TEST_NOW)

      expect(single).toEqual([
        expect.objectContaining({
          body: {
            duration: 'PT2H',
            title: 'Renamed archive',
            updated_at: '2024-05-01T12:00:00Z',
          },
          table: 'videos',
        }),
      ])
      expect(writes()).toEqual(single)
    })

    it('reads a clip as a clip', async () => {
      respondWithSavedVideo(
        createSavedVideo({
          duration: 'PT30S',
          published_at: '2024-05-01T09:00:00+00:00',
          status: 'PUBLISHED',
          title: 'Clip',
          twitch_video: {
            stream_id: null,
            twitch_video_id: 'clip-1',
            type: 'clip',
          },
        }),
      )
      const { client, scraper } = createScraper({
        clips: [createClip({ title: 'Renamed clip' })],
      })

      await expect(scraper.refreshVideo('video-1', TEST_NOW)).resolves.toEqual({
        after: { title: 'Renamed clip' },
        before: { title: 'Clip' },
        status: 'updated',
        title: 'Renamed clip',
      })
      expect(client.getClips).toHaveBeenCalledWith(
        expect.objectContaining({ ids: ['clip-1'] }),
      )
      expect(client.getVideos).not.toHaveBeenCalled()
    })

    it('reports a video that is up to date without writing', async () => {
      respondWithSavedVideo({ ...endedArchive, duration: 'PT2H' })
      const { scraper } = createScraper({ videos: [createVideo()] })

      await expect(scraper.refreshVideo('video-1', TEST_NOW)).resolves.toEqual({
        status: 'unchanged',
        title: 'Archive',
      })
      expect(writes()).toEqual([])
    })

    it('soft-deletes a video Twitch no longer returns, like the scheduled refresh', async () => {
      respondWithSavedVideo(endedArchive)

      await expect(
        createScraper({}).scraper.refreshVideo('video-1', TEST_NOW),
      ).resolves.toEqual({ status: 'unavailable' })
      const single = writes()

      supabase.requests.length = 0
      respondWithSavedVideo(endedArchive)
      await createScraper({}).scraper.refreshRecentVideos(TEST_NOW)

      expect(single).toEqual([
        expect.objectContaining({
          body: expect.objectContaining({
            p_reason: 'unavailable',
            p_video_ids: ['video-1'],
          }),
          table: 'rpc/soft_delete_videos',
        }),
      ])
      expect(writes()).toEqual(single)
    })

    it('reports a video that is not saved, or not a Twitch video', async () => {
      supabase.respond(() => [])
      const { client, scraper } = createScraper({ videos: [createVideo()] })

      await expect(scraper.refreshVideo('video-404')).resolves.toEqual({
        status: 'not-found',
      })
      expect(client.getVideos).not.toHaveBeenCalled()
      expect(client.getStreamsByUserIds).not.toHaveBeenCalled()
    })

    it('links a broadcast on air to its archive and keeps it LIVE', async () => {
      respondWithSavedVideo(createSavedVideo({ title: 'Old title' }))
      const { scraper } = createScraper({
        archives: [createVideo()],
        liveStreams: [createStream()],
      })

      await expect(scraper.refreshVideo('video-1', TEST_NOW)).resolves.toEqual({
        after: { title: 'Live now' },
        before: { title: 'Old title' },
        status: 'updated',
        title: 'Live now',
      })

      expect(supabase.written('PATCH', 'twitch_videos')).toEqual([
        expect.objectContaining({
          body: { twitch_video_id: 'vod-1', type: 'archive' },
          query: { id: 'eq.twitch-row-1' },
        }),
      ])
      expect(supabase.written('PATCH', 'videos')).toEqual([
        expect.objectContaining({
          body: { title: 'Live now', updated_at: '2024-05-01T12:00:00Z' },
        }),
      ])
      expect(supabase.insertedVideos()).toEqual([])
    })

    it('reports a link to the archive as an update', async () => {
      respondWithSavedVideo(createSavedVideo())
      const { scraper } = createScraper({
        archives: [createVideo()],
        liveStreams: [createStream()],
      })

      await expect(scraper.refreshVideo('video-1', TEST_NOW)).resolves.toEqual({
        after: {},
        before: {},
        status: 'updated',
        title: 'Live now',
      })
    })

    it('ends a broadcast that went offline like the scheduled live sync', async () => {
      const fake = { archives: [createVideo()] }

      respondWithSavedVideo(createSavedVideo())
      await expect(
        createScraper(fake).scraper.refreshVideo('video-1', TEST_NOW),
      ).resolves.toEqual({
        // The start time is the same instant, written differently.
        after: { duration: 'PT2H', status: 'ENDED', title: 'Archive' },
        before: { duration: 'P0D', status: 'LIVE', title: 'Live now' },
        status: 'updated',
        title: 'Archive',
      })
      const single = writes()

      supabase.requests.length = 0
      respondWithSavedVideo(createSavedVideo())
      await createScraper(fake).scraper.refreshLiveVideos(TEST_NOW)

      expect(single.map(({ table }) => table)).toEqual([
        'twitch_videos',
        'thumbnails',
        'videos',
      ])
      expect(writes()).toEqual(single)
    })

    it('links an ended broadcast to the archive Twitch lists by now', async () => {
      respondWithSavedVideo(createSavedVideo({ status: 'ENDED' }))
      const { client, scraper } = createScraper({ archives: [createVideo()] })

      await expect(
        scraper.refreshVideo('video-1', TEST_NOW),
      ).resolves.toMatchObject({
        after: { duration: 'PT2H', title: 'Archive' },
        status: 'updated',
      })
      expect(supabase.written('PATCH', 'twitch_videos')[0]?.body).toEqual({
        twitch_video_id: 'vod-1',
        type: 'archive',
      })
      expect(supabase.written('PATCH', 'videos')[0]?.body).toMatchObject({
        duration: 'PT2H',
        status: 'ENDED',
        thumbnail_id: 'thumb-new',
        title: 'Archive',
      })
      // A broadcast that ended long ago may be past the newest few archives.
      expect(client.getVideosByUser).toHaveBeenCalledWith({
        limit: 100,
        type: 'archive',
        userId: 'twitch-user-1',
      })
    })

    it('rejects without ending a broadcast when its archives cannot be read', async () => {
      const error = new Error('helix unavailable')
      respondWithSavedVideo(createSavedVideo())
      const { client, scraper } = createScraper({})
      vi.mocked(client.getVideosByUser).mockImplementation(() => {
        throw error
      })

      await expect(scraper.refreshVideo('video-1', TEST_NOW)).rejects.toBe(
        error,
      )
      expect(writes()).toEqual([])
    })

    it('rejects when the broadcast cannot be linked to its archive', async () => {
      respondWithSavedVideo(createSavedVideo({ status: 'ENDED' }), {
        failing: ['PATCH twitch_videos'],
      })
      const { scraper } = createScraper({ archives: [createVideo()] })

      await expect(scraper.refreshVideo('video-1', TEST_NOW)).rejects.toThrow(
        'Failed to update a Twitch video',
      )
      expect(supabase.written('PATCH', 'videos')).toEqual([])
      expect(onError).not.toHaveBeenCalled()
    })

    it('leaves an ended broadcast whose archive Twitch does not list', async () => {
      respondWithSavedVideo(createSavedVideo({ status: 'ENDED' }))
      const { scraper } = createScraper({})

      await expect(scraper.refreshVideo('video-1', TEST_NOW)).resolves.toEqual({
        status: 'unchanged',
        title: 'Live now',
      })
      expect(writes()).toEqual([])
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

        return table === 'rpc/soft_delete_videos' ? ['video-1'] : []
      })
      const { scraper } = createScraper({})

      await expect(scraper.removeUnavailableVideos(TEST_NOW)).resolves.toBe(
        true,
      )
      expect(
        supabase.written('POST', 'rpc/soft_delete_videos')[0]?.body,
      ).toMatchObject({ p_reason: 'unavailable', p_video_ids: ['video-1'] })
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

  describe('syncTalentAccounts', () => {
    it('syncs the accounts of one talent and returns what changed', async () => {
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

      await expect(scraper.syncTalentAccounts('talent-1')).resolves.toEqual([
        {
          accountId: 'user-row-1',
          changes: {
            after: { twitch_login_name: 'alice' },
            before: { twitch_login_name: 'alice_old' },
          },
          iconUpdated: false,
          name: 'Alice',
          status: 'updated',
        },
      ])
      expect(supabase.requests[0]?.query).toMatchObject({ id: 'eq.talent-1' })
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
        if (table === 'rpc/insert_video') {
          return newVideoId()
        }

        if (method !== 'GET') {
          return []
        }

        if (table === 'twitch_users') {
          return [twitchUserRow]
        }

        // `vod-1` is saved already.
        if (table === 'videos') {
          return [
            createSavedVideo({
              status: 'ENDED',
              twitch_video: { twitch_video_id: 'vod-1', type: 'archive' },
            }),
          ]
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
        supabase.insertedVideos().map(({ platformVideo }) => platformVideo),
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

    it('rejects a page that does not move the cursor forward', async () => {
      supabase.respond(({ method, table }) =>
        method === 'GET' && table === 'twitch_users' ? [twitchUserRow] : [],
      )
      const { scraper } = createScraper({
        historyPages: {
          'page-2': { cursor: 'page-2', videos: [createVideo()] },
        },
      })

      await expect(
        scraper.addPastVideos({ accountId: 'user-row-1', cursor: 'page-2' }),
      ).rejects.toBeInstanceOf(StalledPaginationError)
      expect(supabase.insertedVideos()).toEqual([])
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
