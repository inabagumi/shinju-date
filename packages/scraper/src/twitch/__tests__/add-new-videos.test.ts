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
import { addNewTwitchVideos, planNewVideos } from '../add-new-videos.js'
import type { TwitchFetcher } from '../fetcher.js'
import type { SavedTwitchVideo } from '../saved-video.js'

vi.mock('../../internal/thumbnails/index.js', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../internal/thumbnails/index.js')
  >()),
  createThumbnail: vi.fn(),
  removeThumbnail: vi.fn(),
}))

describe('planNewVideos', () => {
  const archive = createVideo()
  const placeholder = createSavedVideo()

  it('inserts a video that is not saved', () => {
    expect(
      planNewVideos({
        liveStreams: [],
        savedByStreamId: [],
        savedByVideoId: [],
        videos: [archive],
      }),
    ).toEqual([{ kind: 'insert', liveStream: undefined, video: archive }])
  })

  it('skips a video that is already saved', () => {
    const saved = createSavedVideo({
      status: 'ENDED',
      twitch_video: { twitch_video_id: 'vod-1', type: 'archive' },
    })

    expect(
      planNewVideos({
        liveStreams: [],
        savedByStreamId: [saved],
        savedByVideoId: [saved],
        videos: [archive],
      }),
    ).toEqual([])
  })

  it('attaches an archive to the placeholder of its broadcast', () => {
    expect(
      planNewVideos({
        liveStreams: [],
        savedByStreamId: [placeholder],
        savedByVideoId: [],
        videos: [archive],
      }),
    ).toEqual([
      {
        kind: 'link',
        liveStream: undefined,
        saved: placeholder,
        video: archive,
      },
    ])
  })

  it('flags an archive whose broadcast is still on air', () => {
    const stream = createStream()

    expect(
      planNewVideos({
        liveStreams: [stream],
        savedByStreamId: [placeholder],
        savedByVideoId: [],
        videos: [archive],
      }),
    ).toEqual([
      { kind: 'link', liveStream: stream, saved: placeholder, video: archive },
    ])
    expect(
      planNewVideos({
        liveStreams: [stream],
        savedByStreamId: [],
        savedByVideoId: [],
        videos: [archive],
      }),
    ).toEqual([{ kind: 'insert', liveStream: stream, video: archive }])
  })

  it('never brings back a placeholder that was deleted', () => {
    expect(
      planNewVideos({
        liveStreams: [],
        savedByStreamId: [
          createSavedVideo({ deleted_at: '2024-05-01T10:00:00+00:00' }),
        ],
        savedByVideoId: [],
        videos: [archive],
      }),
    ).toEqual([])
  })

  it('skips a video whose stream already belongs to another video', () => {
    const other = createSavedVideo({
      status: 'ENDED',
      twitch_video: { twitch_video_id: 'vod-other', type: 'archive' },
    })

    expect(
      planNewVideos({
        liveStreams: [],
        savedByStreamId: [other],
        savedByVideoId: [],
        videos: [archive],
      }),
    ).toEqual([])
  })

  it('does not treat an upload as part of a live broadcast', () => {
    const upload = createVideo({
      id: 'upload-1',
      stream_id: null,
      type: 'upload',
    })

    expect(
      planNewVideos({
        liveStreams: [createStream()],
        savedByStreamId: [],
        savedByVideoId: [],
        videos: [upload],
      }),
    ).toEqual([{ kind: 'insert', liveStream: undefined, video: upload }])
  })

  it('plans a video listed twice only once', () => {
    expect(
      planNewVideos({
        liveStreams: [],
        savedByStreamId: [],
        savedByVideoId: [],
        videos: [archive, archive],
      }),
    ).toHaveLength(1)
  })
})

describe('addNewTwitchVideos', () => {
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
    failures?: { accountId: string; error: unknown }[]
    liveStreams?: ReturnType<typeof createStream>[]
    uploads?: ReturnType<typeof createVideo>[]
  }

  function createFetcher({
    archives = [],
    failures = [],
    liveStreams = [],
    uploads = [],
  }: FetcherOptions) {
    const getLiveStreams = vi.fn(async () => liveStreams)
    const getRecentVideos = vi.fn(
      async (_userIds: readonly string[], options: { type: string }) =>
        options.type === 'archive'
          ? { failures, missingAccountIds: [], videos: archives }
          : { failures: [], missingAccountIds: [], videos: uploads },
    )

    return {
      fetcher: { getLiveStreams, getRecentVideos } as unknown as TwitchFetcher,
      getLiveStreams,
      getRecentVideos,
    }
  }

  /** Describes the saved rows the lookups by video ID / stream ID return. */
  function mockDatabase(
    savedVideos: SavedTwitchVideo[] = [],
    write: Parameters<typeof supabase.respond>[0] = () => [],
  ) {
    supabase.respond((request) => {
      if (request.method !== 'GET') {
        return write(request)
      }

      if (request.table === 'talents') {
        return [
          {
            id: 'talent-1',
            twitch_users: [
              { id: 'user-row-1', twitch_user_id: 'twitch-user-1' },
            ],
          },
        ]
      }

      const column = request.query['stream_id']
        ? 'stream_id'
        : 'twitch_video_id'
      const ids = (request.query[column] ?? '').slice(4, -1).split(',')

      return savedVideos
        .filter((saved) => ids.includes(String(saved.twitch_video[column])))
        .map(({ twitch_video, ...video }) => ({ ...twitch_video, video }))
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createThumbnail).mockResolvedValue({
      id: 'thumb-new',
      path: 'vod-1/x.jpg',
    })
  })

  it('adds archives and uploads that are not saved yet', async () => {
    mockDatabase()
    const upload = createVideo({
      duration: 'PT5M',
      id: 'upload-1',
      stream_id: null,
      title: 'Upload',
      type: 'upload',
    })
    const { getRecentVideos, fetcher } = createFetcher({
      archives: [createVideo()],
      uploads: [upload],
    })

    const added = await addNewTwitchVideos(createContext(fetcher))

    expect(added).toBe(2)
    expect(getRecentVideos).toHaveBeenCalledWith(['twitch-user-1'], {
      type: 'archive',
    })
    expect(getRecentVideos).toHaveBeenCalledWith(['twitch-user-1'], {
      type: 'upload',
    })

    const videos = supabase
      .written('POST', 'videos')
      .map((request) => request.body as Record<string, unknown>)
    const twitchVideos = supabase
      .written('POST', 'twitch_videos')
      .map((request) => request.body as Record<string, unknown>)

    expect(videos.find((video) => video['title'] === 'Archive')).toMatchObject({
      duration: 'PT2H',
      platform: 'twitch',
      published_at: '2024-05-01T09:00:00Z',
      status: 'ENDED',
      talent_id: 'talent-1',
      thumbnail_id: 'thumb-new',
      video_kind: 'standard',
    })
    expect(videos.find((video) => video['title'] === 'Upload')).toMatchObject({
      status: 'PUBLISHED',
    })
    expect(twitchVideos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stream_id: 'stream-1',
          twitch_user_id: 'user-row-1',
          twitch_video_id: 'vod-1',
          type: 'archive',
        }),
        expect.objectContaining({
          stream_id: null,
          twitch_video_id: 'upload-1',
          type: 'upload',
        }),
      ]),
    )
  })

  it('turns the placeholder of an ended broadcast into its archive', async () => {
    mockDatabase([createSavedVideo({ status: 'ENDED' })])
    const { fetcher } = createFetcher({ archives: [createVideo()] })

    const added = await addNewTwitchVideos(createContext(fetcher))

    expect(added).toBe(1)
    expect(supabase.written('POST', 'videos')).toHaveLength(0)
    expect(supabase.written('PATCH', 'twitch_videos')[0]).toMatchObject({
      body: { twitch_video_id: 'vod-1', type: 'archive' },
      query: { id: 'eq.twitch-row-1' },
    })
    expect(supabase.written('PATCH', 'videos')[0]).toMatchObject({
      body: {
        duration: 'PT2H',
        published_at: '2024-05-01T09:00:00Z',
        status: 'ENDED',
        thumbnail_id: 'thumb-new',
        title: 'Archive',
        updated_at: '2024-05-01T12:00:00Z',
      },
      query: { id: 'eq.video-1' },
    })
  })

  it('keeps a broadcast LIVE when its archive shows up while on air', async () => {
    mockDatabase([createSavedVideo()])
    const { fetcher } = createFetcher({
      archives: [createVideo({ duration: 'PT10M', thumbnail_url: '' })],
      liveStreams: [createStream()],
    })

    const added = await addNewTwitchVideos(createContext(fetcher))

    expect(added).toBe(0)
    expect(supabase.written('PATCH', 'twitch_videos')[0]?.body).toEqual({
      twitch_video_id: 'vod-1',
      type: 'archive',
    })
    expect(supabase.written('PATCH', 'videos')).toHaveLength(0)
    expect(createThumbnail).not.toHaveBeenCalled()
  })

  it('adds a broadcast that is on air as LIVE when it has no row yet', async () => {
    mockDatabase()
    const { fetcher } = createFetcher({
      archives: [createVideo({ duration: 'PT10M', thumbnail_url: '' })],
      liveStreams: [createStream()],
    })

    const added = await addNewTwitchVideos(createContext(fetcher))

    expect(added).toBe(1)
    expect(supabase.written('POST', 'videos')[0]?.body).toMatchObject({
      duration: 'P0D',
      status: 'LIVE',
      title: 'Live now',
    })
    expect(supabase.written('POST', 'twitch_videos')[0]?.body).toMatchObject({
      stream_id: 'stream-1',
      twitch_video_id: 'vod-1',
      type: 'archive',
    })
    expect(createThumbnail).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({
          url: 'https://cdn.test/live-1280x720.jpg',
        }),
      }),
    )
  })

  it('adds a video without a thumbnail while Twitch is still processing it', async () => {
    mockDatabase()
    const { fetcher } = createFetcher({
      archives: [
        createVideo({
          thumbnail_url:
            'https://vod-secure.twitch.tv/_404/404_processing_%{width}x%{height}.png',
        }),
      ],
    })

    await addNewTwitchVideos(createContext(fetcher))

    expect(createThumbnail).not.toHaveBeenCalled()
    expect(supabase.written('POST', 'videos')[0]?.body).toMatchObject({
      thumbnail_id: null,
    })
  })

  it('leaves saved videos alone', async () => {
    mockDatabase([
      createSavedVideo({
        status: 'ENDED',
        twitch_video: { twitch_video_id: 'vod-1', type: 'archive' },
      }),
    ])
    const { fetcher } = createFetcher({ archives: [createVideo()] })

    const added = await addNewTwitchVideos(createContext(fetcher))

    expect(added).toBe(0)
    expect(supabase.requests.every((request) => request.method === 'GET')).toBe(
      true,
    )
  })

  it('quietly skips a video another run saved first', async () => {
    mockDatabase([], ({ method, table }) =>
      method === 'POST' && table === 'twitch_videos'
        ? postgresError('23505', 'duplicate key value')
        : [],
    )
    const { fetcher } = createFetcher({ archives: [createVideo()] })

    const added = await addNewTwitchVideos(createContext(fetcher))

    expect(added).toBe(0)
    expect(supabase.written('DELETE', 'videos')).toHaveLength(1)
    expect(reportError).not.toHaveBeenCalled()
  })

  it('reports accounts that could not be read and handles the rest', async () => {
    const error = new Error('helix unavailable')
    mockDatabase()
    const { fetcher } = createFetcher({
      archives: [createVideo()],
      failures: [{ accountId: 'twitch-user-9', error }],
    })

    const added = await addNewTwitchVideos(createContext(fetcher))

    expect(added).toBe(1)
    expect(reportError).toHaveBeenCalledWith(error, {
      twitchUserId: 'twitch-user-9',
    })
  })

  it('does not call Twitch when no account is registered', async () => {
    supabase.respond(() => [])
    const { getLiveStreams, fetcher } = createFetcher({})

    const added = await addNewTwitchVideos(createContext(fetcher))

    expect(added).toBe(0)
    expect(getLiveStreams).not.toHaveBeenCalled()
  })
})
