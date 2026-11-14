import { Temporal } from 'temporal-polyfill'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestContext } from '../../internal/testing/context.js'
import {
  postgresError,
  setupSupabase,
} from '../../internal/testing/supabase.js'
import {
  createSavedVideo,
  createStream,
  createVideo,
} from '../../internal/testing/twitch.js'
import { createThumbnail } from '../../internal/thumbnails/index.js'
import type { TwitchFetcher } from '../fetcher.js'
import type { SavedTwitchVideo } from '../saved-video.js'
import {
  planLiveSync,
  type SavedLiveVideo,
  syncTwitchLive,
} from '../sync-live.js'

vi.mock('../../internal/thumbnails/index.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../internal/thumbnails/index.js')
  >()),
  createThumbnail: vi.fn(),
  removeThumbnail: vi.fn(),
}))

function createLiveVideo(
  overrides: Parameters<typeof createSavedVideo>[0] = {},
  twitchUserId: string | null = 'twitch-user-1',
): SavedLiveVideo {
  return { ...createSavedVideo(overrides), twitchUserId }
}

describe('planLiveSync', () => {
  const activeTwitchUserIds = new Set(['twitch-user-1'])

  it('starts tracking a stream that just went on air', () => {
    const stream = createStream()

    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [stream],
        savedByStreamId: [],
        savedLiveVideos: [],
      }),
    ).toEqual({ ended: [], refreshed: [], started: [stream] })
  })

  it('ignores streams of accounts that are not crawled', () => {
    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [createStream({ user_id: 'twitch-user-9' })],
        savedByStreamId: [],
        savedLiveVideos: [],
      }).started,
    ).toEqual([])
  })

  it('leaves a broadcast that is still on air alone', () => {
    const saved = createLiveVideo()

    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [createStream()],
        savedByStreamId: [saved],
        savedLiveVideos: [saved],
      }),
    ).toEqual({ ended: [], refreshed: [], started: [] })
  })

  it('follows title changes during a broadcast', () => {
    const saved = createLiveVideo()

    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [createStream({ title: 'New title' })],
        savedByStreamId: [saved],
        savedLiveVideos: [saved],
      }).refreshed,
    ).toEqual([{ saved, values: { title: 'New title' } }])
  })

  it('ends a broadcast whose stream went offline', () => {
    const saved = createLiveVideo()

    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [],
        savedByStreamId: [],
        savedLiveVideos: [saved],
      }),
    ).toEqual({ ended: [saved], refreshed: [], started: [] })
  })

  it('ends only the broadcasts that went offline', () => {
    const onAir = createLiveVideo()
    const offline = createLiveVideo({
      id: 'video-2',
      twitch_video: { id: 'twitch-row-2', stream_id: 'stream-2' },
    })

    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [createStream()],
        savedByStreamId: [onAir],
        savedLiveVideos: [onAir, offline],
      }).ended,
    ).toEqual([offline])
  })

  it('marks a row LIVE again when Twitch still reports its stream', () => {
    // Twitch can briefly stop listing a stream that is still on air, and an
    // archive can be saved as ENDED before its stream was seen.
    const saved = createSavedVideo({
      status: 'ENDED',
      twitch_video: { twitch_video_id: 'vod-1', type: 'archive' },
    })

    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [createStream()],
        savedByStreamId: [saved],
        savedLiveVideos: [],
      }),
    ).toEqual({
      ended: [],
      refreshed: [{ saved, values: { status: 'LIVE' } }],
      started: [],
    })
  })

  it('never brings back a row that was deleted', () => {
    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [createStream()],
        savedByStreamId: [
          createSavedVideo({
            deleted_at: '2024-05-01T10:00:00+00:00',
            status: 'ENDED',
          }),
        ],
        savedLiveVideos: [],
      }),
    ).toEqual({ ended: [], refreshed: [], started: [] })
  })

  it('ends a LIVE row that has no stream to check', () => {
    const saved = createLiveVideo({ twitch_video: { stream_id: null } })

    expect(
      planLiveSync({
        activeTwitchUserIds,
        liveStreams: [createStream()],
        savedByStreamId: [],
        savedLiveVideos: [saved],
      }).ended,
    ).toEqual([saved])
  })
})

describe('syncTwitchLive', () => {
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

  interface FetcherOptions {
    archives?: ReturnType<typeof createVideo>[]
    liveStreams?: ReturnType<typeof createStream>[]
  }

  function createFetcher({ archives = [], liveStreams = [] }: FetcherOptions) {
    const getLiveStreams = vi.fn(async () => liveStreams)
    const getRecentVideos = vi.fn(async () => ({
      failures: [],
      missingAccountIds: [],
      videos: archives,
    }))

    return {
      fetcher: { getLiveStreams, getRecentVideos } as unknown as TwitchFetcher,
      getLiveStreams,
      getRecentVideos,
    }
  }

  interface DatabaseOptions {
    /** Rows the lookup by stream ID returns. */
    savedByStreamId?: SavedTwitchVideo[]
    /** Rows currently shown as LIVE. */
    savedLiveVideos?: SavedLiveVideo[]
    write?: Parameters<typeof supabase.respond>[0]
  }

  function mockDatabase({
    savedByStreamId,
    savedLiveVideos = [],
    write = () => [],
  }: DatabaseOptions = {}) {
    supabase.respond((request) => {
      if (request.method !== 'GET') {
        return write(request)
      }

      switch (request.table) {
        case 'talents':
          return [
            {
              id: 'talent-1',
              twitch_users: [
                { id: 'user-row-1', twitch_user_id: 'twitch-user-1' },
              ],
            },
          ]
        case 'videos':
          return savedLiveVideos.map(
            ({ twitch_video, twitchUserId, ...video }) => ({
              ...video,
              twitch_video: {
                ...twitch_video,
                twitch_user: twitchUserId
                  ? { twitch_user_id: twitchUserId }
                  : null,
              },
            }),
          )
        default:
          return (savedByStreamId ?? savedLiveVideos).map(
            ({ twitch_video, ...video }) => ({ ...twitch_video, video }),
          )
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createThumbnail).mockResolvedValue({
      id: 'thumb-new',
      path: 'x/y.jpg',
    })
  })

  it('adds a LIVE row for a stream that just went on air', async () => {
    mockDatabase()
    const { getLiveStreams, fetcher } = createFetcher({
      liveStreams: [createStream()],
    })

    const changed = await syncTwitchLive(createContext(fetcher))

    expect(changed).toBeGreaterThan(0)
    expect(getLiveStreams).toHaveBeenCalledWith(['twitch-user-1'])
    expect(supabase.written('POST', 'videos')[0]?.body).toMatchObject({
      created_at: '2024-05-01T12:00:00Z',
      duration: 'P0D',
      platform: 'twitch',
      published_at: '2024-05-01T09:00:00Z',
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
    expect(createThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: 'live:stream-1',
        source: expect.objectContaining({
          url: 'https://cdn.test/live-1280x720.jpg',
        }),
      }),
    )
  })

  it('changes nothing while a tracked broadcast stays on air', async () => {
    mockDatabase({ savedLiveVideos: [createLiveVideo()] })
    const { getRecentVideos, fetcher } = createFetcher({
      liveStreams: [createStream()],
    })

    const changed = await syncTwitchLive(createContext(fetcher))

    expect(changed).toBe(0)
    expect(supabase.requests.every((request) => request.method === 'GET')).toBe(
      true,
    )
    expect(getRecentVideos).not.toHaveBeenCalled()
  })

  it('follows a title change', async () => {
    mockDatabase({ savedLiveVideos: [createLiveVideo()] })
    const { fetcher } = createFetcher({
      liveStreams: [createStream({ title: 'New title' })],
    })

    const changed = await syncTwitchLive(createContext(fetcher))

    expect(changed).toBeGreaterThan(0)
    expect(supabase.written('PATCH', 'videos')[0]).toMatchObject({
      body: { title: 'New title', updated_at: '2024-05-01T12:00:00Z' },
      query: { id: 'eq.video-1' },
    })
  })

  it('ends a broadcast and keeps the placeholder until the archive exists', async () => {
    mockDatabase({ savedLiveVideos: [createLiveVideo()] })
    const { getRecentVideos, fetcher } = createFetcher({})

    const changed = await syncTwitchLive(createContext(fetcher))

    expect(changed).toBeGreaterThan(0)
    expect(getRecentVideos).toHaveBeenCalledWith(['twitch-user-1'], {
      type: 'archive',
    })
    expect(supabase.written('PATCH', 'videos')[0]?.body).toEqual({
      status: 'ENDED',
      updated_at: '2024-05-01T12:00:00Z',
    })
    expect(supabase.written('PATCH', 'twitch_videos')).toHaveLength(0)
  })

  it('ends a broadcast and takes over its archive', async () => {
    mockDatabase({ savedLiveVideos: [createLiveVideo()] })
    const { fetcher } = createFetcher({
      archives: [
        createVideo({ id: 'vod-other', stream_id: 'stream-other' }),
        createVideo(),
      ],
    })

    await syncTwitchLive(createContext(fetcher))

    expect(supabase.written('PATCH', 'twitch_videos')[0]).toMatchObject({
      body: { twitch_video_id: 'vod-1', type: 'archive' },
      query: { id: 'eq.twitch-row-1' },
    })
    expect(supabase.written('PATCH', 'videos')[0]?.body).toEqual({
      duration: 'PT2H',
      published_at: '2024-05-01T09:00:00Z',
      status: 'ENDED',
      thumbnail_id: 'thumb-new',
      title: 'Archive',
      updated_at: '2024-05-01T12:00:00Z',
    })
  })

  it('keeps the live thumbnail while the archive has none', async () => {
    mockDatabase({ savedLiveVideos: [createLiveVideo()] })
    const { fetcher } = createFetcher({
      archives: [createVideo({ thumbnail_url: '' })],
    })

    await syncTwitchLive(createContext(fetcher))

    expect(createThumbnail).not.toHaveBeenCalled()
    expect(supabase.written('PATCH', 'videos')[0]?.body).not.toHaveProperty(
      'thumbnail_id',
    )
  })

  it('ends a broadcast whose archive was attached while on air', async () => {
    mockDatabase({
      savedLiveVideos: [
        createLiveVideo({
          twitch_video: { twitch_video_id: 'vod-1', type: 'archive' },
        }),
      ],
    })
    const { fetcher } = createFetcher({ archives: [createVideo()] })

    await syncTwitchLive(createContext(fetcher))

    expect(supabase.written('PATCH', 'twitch_videos')).toHaveLength(0)
    expect(supabase.written('PATCH', 'videos')[0]?.body).toMatchObject({
      duration: 'PT2H',
      status: 'ENDED',
    })
  })

  it('still ends broadcasts of accounts that are no longer crawled', async () => {
    mockDatabase({
      savedLiveVideos: [
        createLiveVideo(
          { twitch_video: { stream_id: 'stream-9' } },
          'twitch-user-9',
        ),
      ],
    })
    const { getLiveStreams, fetcher } = createFetcher({})

    await syncTwitchLive(createContext(fetcher))

    expect(getLiveStreams).toHaveBeenCalledWith([
      'twitch-user-1',
      'twitch-user-9',
    ])
    expect(supabase.written('PATCH', 'videos')[0]?.body).toMatchObject({
      status: 'ENDED',
    })
  })

  it('ends a broadcast whose account is gone without asking Twitch', async () => {
    mockDatabase({ savedLiveVideos: [createLiveVideo({}, null)] })
    const { getRecentVideos, fetcher } = createFetcher({})

    await syncTwitchLive(createContext(fetcher))

    expect(getRecentVideos).not.toHaveBeenCalled()
    expect(supabase.written('PATCH', 'videos')[0]?.body).toMatchObject({
      status: 'ENDED',
    })
  })

  it('quietly skips a stream another run started tracking first', async () => {
    mockDatabase({
      write: ({ method, table }) =>
        method === 'POST' && table === 'twitch_videos'
          ? postgresError('23505', 'duplicate key value')
          : [],
    })
    const { fetcher } = createFetcher({ liveStreams: [createStream()] })

    const changed = await syncTwitchLive(createContext(fetcher))

    expect(changed).toBe(0)
    expect(reportError).not.toHaveBeenCalled()
  })

  it('reports a broadcast that could not be ended and handles the rest', async () => {
    mockDatabase({
      savedLiveVideos: [
        createLiveVideo(),
        createLiveVideo({
          id: 'video-2',
          twitch_video: { id: 'twitch-row-2', stream_id: 'stream-2' },
        }),
      ],
      write: ({ query }) =>
        query['id'] === 'eq.video-1'
          ? postgresError('40001', 'could not serialize access')
          : [],
    })
    const { fetcher } = createFetcher({})

    const changed = await syncTwitchLive(createContext(fetcher))

    expect(changed).toBeGreaterThan(0)
    expect(supabase.written('PATCH', 'videos')).toHaveLength(2)
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('could not serialize access'),
      }),
      { videoId: 'video-1' },
    )
  })
})
