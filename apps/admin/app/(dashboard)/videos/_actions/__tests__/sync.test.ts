import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncVideoWithTwitch } from '../sync'

vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: vi.fn(),
}))

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
  getVideos: vi.fn(),
}))

vi.mock('@shinju-date/youtube-scraper', () => ({
  getPublishedAt: vi.fn(),
  getVideoStatus: vi.fn(),
}))

vi.mock('@shinju-date/twitch-api-client', () => ({
  getClips: vi.fn(),
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

  it('should return error when not a Twitch video', async () => {
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
