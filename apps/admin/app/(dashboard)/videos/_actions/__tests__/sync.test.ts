import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncVideoWithTwitch } from '../sync'

vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: vi.fn(),
}))

// Server Action の認証ガードを通過させ、各テストでモックした Supabase クライアントを渡す
vi.mock('@/lib/auth', async (importOriginal) => {
  const { createSupabaseServerClient } = await import('@/lib/supabase')

  return {
    ...(await importOriginal<typeof import('@/lib/auth')>()),
    requireAuthenticatedUser: vi.fn(async () => ({
      supabaseClient: await createSupabaseServerClient(),
      user: { id: 'test-user-id' },
    })),
  }
})

vi.mock('@shinju-date/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@/lib/audit-log', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@shinju-date/web-cache', () => ({
  revalidateTags: vi.fn(),
}))

vi.mock('@shinju-date/temporal-fns', () => ({
  toDBString: vi.fn((instant: { toString: () => string } | string) =>
    typeof instant === 'string' ? instant : instant.toString(),
  ),
}))

vi.mock('temporal-polyfill', () => ({
  Temporal: {
    Instant: {
      from: (value: string) => ({
        equals: (other: { toString: () => string }) =>
          value === other.toString(),
        toString: () => value,
      }),
    },
    Now: {
      instant: vi.fn(() => ({
        toString: () => '2024-11-24T17:00:00Z',
      })),
    },
  },
}))

vi.mock('@shinju-date/youtube-api-client', () => ({
  getPublishedAt: vi.fn(),
  getVideoStatus: vi.fn(),
  getVideos: vi.fn(),
}))

vi.mock('@shinju-date/twitch-api-client', async (importOriginal) => ({
  // Keep the pure helpers (ID and status rules) real; mock Helix calls only.
  ...(await importOriginal<typeof import('@shinju-date/twitch-api-client')>()),
  getArchiveOfStream: vi.fn(),
  getClips: vi.fn(),
  getLiveStream: vi.fn(),
  getVideos: vi.fn(),
}))

const videoId = '30000000-0000-0000-0000-000000000101'
const twitchVideoRowId = '14000000-0000-0000-0000-000000000101'
const twitchVideoId = '1234567890'

describe('syncVideoWithTwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update archive video metadata from Helix Videos API', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { getVideos } = await import('@shinju-date/twitch-api-client')

    const mockUpdate = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEq })

    const mockSupabaseClient = {
      from: vi.fn((table: string) => {
        if (table === 'videos') {
          return {
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                duration: 'PT3H',
                id: videoId,
                platform: 'twitch',
                published_at: '2024-01-01T00:00:00Z',
                status: 'ENDED',
                title: 'Old Title',
                twitch_video: {
                  id: twitchVideoRowId,
                  twitch_video_id: twitchVideoId,
                  type: 'archive',
                },
                visible: true,
              },
              error: null,
            }),
            update: mockUpdate,
          }
        }
        return {
          eq: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
        }
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    async function* mockGetVideos() {
      yield {
        created_at: '2024-06-01T12:00:00Z',
        description: '',
        duration: 'PT1H',
        id: twitchVideoId,
        language: 'ja',
        published_at: '2024-06-01T12:00:00Z',
        stream_id: null,
        thumbnail_url: '',
        title: 'New Archive Title',
        type: 'archive' as const,
        url: `https://www.twitch.tv/videos/${twitchVideoId}`,
        user_id: '100001',
        user_login: 'alice',
        user_name: 'Alice',
        view_count: 10,
        viewable: 'public',
      }
    }

    vi.mocked(getVideos).mockReturnValue(mockGetVideos() as never)

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({ success: true })
    expect(getVideos).toHaveBeenCalledWith({ ids: [twitchVideoId] })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 'PT1H',
        title: 'New Archive Title',
      }),
    )
    expect(createAuditLog).toHaveBeenCalledWith(
      'VIDEO_SYNC',
      'videos',
      videoId,
      expect.objectContaining({
        platform: 'twitch',
      }),
    )
  })

  it('should sync clip metadata from Helix Clips API', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getClips, getVideos } = await import(
      '@shinju-date/twitch-api-client'
    )

    const mockUpdate = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEq })

    const clipId = 'AwkwardHelplessSalamanderSwiftRage'
    const mockSupabaseClient = {
      from: vi.fn((table: string) => {
        if (table === 'videos') {
          return {
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                duration: 'PT30S',
                id: videoId,
                platform: 'twitch',
                published_at: '2024-01-01T00:00:00Z',
                status: 'PUBLISHED',
                title: 'Old Clip',
                twitch_video: {
                  id: twitchVideoRowId,
                  twitch_video_id: clipId,
                  type: 'clip',
                },
                visible: true,
              },
              error: null,
            }),
            update: mockUpdate,
          }
        }
        return {
          eq: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
        }
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    async function* mockGetClips() {
      yield {
        broadcaster_id: '100001',
        broadcaster_name: 'Alice',
        created_at: '2024-07-01T08:00:00Z',
        creator_id: '100002',
        creator_name: 'Bob',
        duration: 'PT25S',
        embed_url: '',
        game_id: '1',
        id: clipId,
        language: 'ja',
        thumbnail_url: '',
        title: 'New Clip Title',
        url: `https://clips.twitch.tv/${clipId}`,
        video_id: '999',
        view_count: 5,
        vod_offset: null,
      }
    }

    vi.mocked(getClips).mockReturnValue(mockGetClips() as never)

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({ success: true })
    expect(getClips).toHaveBeenCalledWith({ ids: [clipId] })
    expect(getVideos).not.toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 'PT25S',
        title: 'New Clip Title',
      }),
    )
  })

  it('should return already up to date when nothing changed', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getVideos } = await import('@shinju-date/twitch-api-client')
    const { createAuditLog } = await import('@/lib/audit-log')

    const mockSupabaseClient = {
      from: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            duration: 'PT1H',
            id: videoId,
            platform: 'twitch',
            published_at: '2024-06-01T12:00:00Z',
            status: 'ENDED',
            title: 'Same Title',
            twitch_video: {
              id: twitchVideoRowId,
              twitch_video_id: twitchVideoId,
              type: 'archive',
            },
            visible: true,
          },
          error: null,
        }),
        update: vi.fn(),
      })),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    async function* mockGetVideos() {
      yield {
        created_at: '2024-06-01T12:00:00Z',
        description: '',
        duration: 'PT1H',
        id: twitchVideoId,
        language: 'ja',
        published_at: '2024-06-01T12:00:00Z',
        stream_id: null,
        thumbnail_url: '',
        title: 'Same Title',
        type: 'archive' as const,
        url: `https://www.twitch.tv/videos/${twitchVideoId}`,
        user_id: '100001',
        user_login: 'alice',
        user_name: 'Alice',
        view_count: 10,
        viewable: 'public',
      }
    }

    vi.mocked(getVideos).mockReturnValue(mockGetVideos() as never)

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({
      message: '動画情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    expect(createAuditLog).not.toHaveBeenCalled()
  })

  it('should return error when the video row is not found', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')

    const mockSupabaseClient = {
      from: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: 'PGRST116',
            message: 'The result contains 0 rows',
          },
        }),
      })),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await syncVideoWithTwitch(videoId)

    expect(result.success).toBe(false)
  })
})

const streamId = '316000000001'
const twitchUserId = '100001'
const placeholderId = `live:${streamId}`

interface SavedTwitchVideoRow {
  duration: string
  published_at: string
  status: 'ENDED' | 'LIVE' | 'PUBLISHED'
  title: string
  twitch_video: {
    stream_id: string | null
    twitch_video_id: string
    type: 'archive' | 'clip' | 'highlight' | 'upload' | null
  }
}

function createMockTwitchVideoClient(row: SavedTwitchVideoRow) {
  const mockVideosEq = vi.fn().mockResolvedValue({ error: null })
  const mockVideosUpdate = vi.fn().mockReturnValue({ eq: mockVideosEq })
  const mockTwitchVideosEq = vi.fn().mockResolvedValue({ error: null })
  const mockTwitchVideosUpdate = vi
    .fn()
    .mockReturnValue({ eq: mockTwitchVideosEq })

  const mockSupabaseClient = {
    from: vi.fn((table: string) => {
      if (table === 'videos') {
        return {
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              ...row,
              id: videoId,
              platform: 'twitch',
              twitch_video: {
                ...row.twitch_video,
                id: twitchVideoRowId,
                twitch_user: { twitch_user_id: twitchUserId },
              },
              visible: true,
            },
            error: null,
          }),
          update: mockVideosUpdate,
        }
      }

      if (table === 'twitch_videos') {
        return { update: mockTwitchVideosUpdate }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return {
    mockSupabaseClient,
    mockTwitchVideosEq,
    mockTwitchVideosUpdate,
    mockVideosUpdate,
  }
}

function liveStream(title: string) {
  return {
    game_id: '1',
    game_name: 'Just Chatting',
    id: streamId,
    is_mature: false,
    language: 'ja',
    started_at: '2024-06-01T12:00:00Z',
    tags: [],
    thumbnail_url: '',
    title,
    type: 'live' as const,
    user_id: twitchUserId,
    user_login: 'alice',
    user_name: 'Alice',
    viewer_count: 100,
  }
}

function archive(id: string, title: string) {
  return {
    created_at: '2024-06-01T12:00:00Z',
    description: '',
    duration: 'PT2H',
    id,
    language: 'ja',
    published_at: '2024-06-01T12:00:05Z',
    stream_id: streamId,
    thumbnail_url: '',
    title,
    type: 'archive' as const,
    url: `https://www.twitch.tv/videos/${id}`,
    user_id: twitchUserId,
    user_login: 'alice',
    user_name: 'Alice',
    view_count: 10,
    viewable: 'public',
  }
}

describe('syncVideoWithTwitch for broadcasts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps an on-air placeholder LIVE and follows the stream title', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { getArchiveOfStream, getLiveStream, getVideos } = await import(
      '@shinju-date/twitch-api-client'
    )

    const { mockSupabaseClient, mockTwitchVideosUpdate, mockVideosUpdate } =
      createMockTwitchVideoClient({
        duration: 'P0D',
        published_at: '2024-06-01T12:00:00Z',
        status: 'LIVE',
        title: 'Old Stream Title',
        twitch_video: {
          stream_id: streamId,
          twitch_video_id: placeholderId,
          type: null,
        },
      })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )
    vi.mocked(getLiveStream).mockResolvedValue(liveStream('New Stream Title'))

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({
      message: '配信中の状態を同期しました。',
      success: true,
    })
    expect(getLiveStream).toHaveBeenCalledWith({
      streamId,
      userId: twitchUserId,
    })
    expect(getArchiveOfStream).not.toHaveBeenCalled()
    // The placeholder is not a Helix video ID and must not be looked up.
    expect(getVideos).not.toHaveBeenCalled()
    expect(mockVideosUpdate).toHaveBeenCalledWith({
      title: 'New Stream Title',
      updated_at: '2024-11-24T17:00:00Z',
    })
    expect(mockTwitchVideosUpdate).not.toHaveBeenCalled()
    expect(createAuditLog).toHaveBeenCalledWith(
      'VIDEO_SYNC',
      'videos',
      videoId,
      {
        after: { title: 'New Stream Title' },
        before: { title: 'Old Stream Title' },
        platform: 'twitch',
      },
    )
  })

  it('does not end a broadcast whose archive was linked while on air', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { getLiveStream, getVideos } = await import(
      '@shinju-date/twitch-api-client'
    )

    const { mockSupabaseClient, mockVideosUpdate } =
      createMockTwitchVideoClient({
        duration: 'P0D',
        published_at: '2024-06-01T12:00:00Z',
        status: 'LIVE',
        title: 'Stream Title',
        twitch_video: {
          stream_id: streamId,
          twitch_video_id: '900',
          type: 'archive',
        },
      })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )
    vi.mocked(getLiveStream).mockResolvedValue(liveStream('Stream Title'))

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({
      message: '動画情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    expect(getVideos).not.toHaveBeenCalled()
    expect(mockVideosUpdate).not.toHaveBeenCalled()
    expect(createAuditLog).not.toHaveBeenCalled()
  })

  it('ends an offline placeholder and takes over its archive', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { getArchiveOfStream, getLiveStream } = await import(
      '@shinju-date/twitch-api-client'
    )

    const {
      mockSupabaseClient,
      mockTwitchVideosEq,
      mockTwitchVideosUpdate,
      mockVideosUpdate,
    } = createMockTwitchVideoClient({
      duration: 'P0D',
      published_at: '2024-06-01T12:00:00Z',
      status: 'LIVE',
      title: 'Stream Title',
      twitch_video: {
        stream_id: streamId,
        twitch_video_id: placeholderId,
        type: null,
      },
    })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )
    vi.mocked(getLiveStream).mockResolvedValue(null)
    vi.mocked(getArchiveOfStream).mockResolvedValue(
      archive('901', 'Archive Title'),
    )

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({ success: true })
    expect(getArchiveOfStream).toHaveBeenCalledWith({
      streamId,
      userId: twitchUserId,
    })
    expect(mockTwitchVideosUpdate).toHaveBeenCalledWith({
      twitch_video_id: '901',
      type: 'archive',
    })
    expect(mockTwitchVideosEq).toHaveBeenCalledWith('id', twitchVideoRowId)
    expect(mockVideosUpdate).toHaveBeenCalledWith({
      duration: 'PT2H',
      published_at: '2024-06-01T12:00:05Z',
      status: 'ENDED',
      title: 'Archive Title',
      updated_at: '2024-11-24T17:00:00Z',
    })
    expect(createAuditLog).toHaveBeenCalledWith(
      'VIDEO_SYNC',
      'videos',
      videoId,
      expect.objectContaining({
        after: expect.objectContaining({ status: 'ENDED' }),
        before: expect.objectContaining({ status: 'LIVE' }),
        twitch_type: { after: 'archive', before: null },
        twitch_video_id: { after: '901', before: placeholderId },
      }),
    )
  })

  it('only ends an offline placeholder whose broadcast has no archive', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { getArchiveOfStream, getLiveStream } = await import(
      '@shinju-date/twitch-api-client'
    )

    const { mockSupabaseClient, mockTwitchVideosUpdate, mockVideosUpdate } =
      createMockTwitchVideoClient({
        duration: 'P0D',
        published_at: '2024-06-01T12:00:00Z',
        status: 'LIVE',
        title: 'Stream Title',
        twitch_video: {
          stream_id: streamId,
          twitch_video_id: placeholderId,
          type: null,
        },
      })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )
    vi.mocked(getLiveStream).mockResolvedValue(null)
    vi.mocked(getArchiveOfStream).mockResolvedValue(null)

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({
      message:
        '配信は終了しています。アーカイブが見つからないため、配信の終了のみ反映しました。',
      success: true,
    })
    expect(mockTwitchVideosUpdate).not.toHaveBeenCalled()
    expect(mockVideosUpdate).toHaveBeenCalledWith({
      status: 'ENDED',
      updated_at: '2024-11-24T17:00:00Z',
    })
    expect(createAuditLog).toHaveBeenCalledWith(
      'VIDEO_SYNC',
      'videos',
      videoId,
      {
        after: { status: 'ENDED' },
        before: { status: 'LIVE' },
        platform: 'twitch',
      },
    )
  })

  it('treats an ended placeholder without an archive as up to date', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getArchiveOfStream, getLiveStream } = await import(
      '@shinju-date/twitch-api-client'
    )

    const { mockSupabaseClient, mockVideosUpdate } =
      createMockTwitchVideoClient({
        duration: 'P0D',
        published_at: '2024-06-01T12:00:00Z',
        status: 'ENDED',
        title: 'Stream Title',
        twitch_video: {
          stream_id: streamId,
          twitch_video_id: placeholderId,
          type: null,
        },
      })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )
    vi.mocked(getLiveStream).mockResolvedValue(null)
    vi.mocked(getArchiveOfStream).mockResolvedValue(null)

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({
      message: '動画情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    expect(mockVideosUpdate).not.toHaveBeenCalled()
  })

  it('ends a linked archive once its broadcast went offline', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getArchiveOfStream, getLiveStream, getVideos } = await import(
      '@shinju-date/twitch-api-client'
    )

    const { mockSupabaseClient, mockTwitchVideosUpdate, mockVideosUpdate } =
      createMockTwitchVideoClient({
        duration: 'P0D',
        published_at: '2024-06-01T12:00:00Z',
        status: 'LIVE',
        title: 'Stream Title',
        twitch_video: {
          stream_id: streamId,
          twitch_video_id: '900',
          type: 'archive',
        },
      })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )
    vi.mocked(getLiveStream).mockResolvedValue(null)

    async function* mockGetVideos() {
      yield archive('900', 'Archive Title')
    }

    vi.mocked(getVideos).mockReturnValue(mockGetVideos() as never)

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({ success: true })
    expect(getArchiveOfStream).not.toHaveBeenCalled()
    expect(getVideos).toHaveBeenCalledWith({ ids: ['900'] })
    expect(mockTwitchVideosUpdate).not.toHaveBeenCalled()
    expect(mockVideosUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 'PT2H',
        status: 'ENDED',
        title: 'Archive Title',
      }),
    )
  })
})
