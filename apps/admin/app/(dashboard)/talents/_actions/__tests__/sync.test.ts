import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncTalentWithYouTube } from '../sync'

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
  toDBString: vi.fn((instant) => instant.toString()),
}))

vi.mock('temporal-polyfill', () => ({
  Temporal: {
    Now: {
      instant: vi.fn(() => ({
        toString: () => '2024-11-24T17:00:00Z',
      })),
    },
  },
}))

vi.mock('@shinju-date/youtube-api-client', () => ({
  getChannels: vi.fn(),
}))

const talentId = '123e4567-e89b-12d3-a456-426614174000'
const channelRowId = 'channel-row-uuid'
const youtubeChannelId = 'UCabcdefghijklmnopqrstuv'

describe('syncTalentWithYouTube', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update talent name and channel handle from YouTube snippet', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')
    const { getChannels } = await import('@shinju-date/youtube-api-client')

    const mockUpdate = vi.fn().mockReturnThis()
    const mockUpsert = vi.fn().mockResolvedValue({ error: null })
    const mockEq = vi.fn().mockResolvedValue({ error: null })

    const mockSupabaseClient = {
      from: vi.fn((table: string) => {
        if (table === 'talents') {
          return {
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: talentId,
                name: 'Old Name',
                youtube_channels: [
                  {
                    id: channelRowId,
                    youtube_channel_id: youtubeChannelId,
                  },
                ],
              },
              error: null,
            }),
            update: mockUpdate,
          }
        }

        if (table === 'youtube_channels') {
          return {
            upsert: mockUpsert,
          }
        }

        return {
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    }

    // Chain for talents update: update().eq()
    mockUpdate.mockReturnValue({ eq: mockEq })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    async function* mockGetChannels() {
      yield {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UUabcdefghijklmnopqrstuv',
          },
        },
        id: youtubeChannelId,
        snippet: {
          customUrl: '@newhandle',
          title: 'New Channel Name',
        },
      }
    }

    vi.mocked(getChannels).mockReturnValue(mockGetChannels() as never)

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({ success: true })
    expect(getChannels).toHaveBeenCalledWith({ ids: [youtubeChannelId] })
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        id: channelRowId,
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
        youtube_handle: '@newhandle',
      },
      { onConflict: 'id' },
    )
    expect(mockUpdate).toHaveBeenCalledWith({
      name: 'New Channel Name',
      updated_at: '2024-11-24T17:00:00Z',
    })
    expect(createAuditLog).toHaveBeenCalledWith(
      'CHANNEL_SYNC',
      'channels',
      talentId,
      {
        after: { name: 'New Channel Name' },
        before: { name: 'Old Name' },
      },
    )
    expect(revalidatePath).toHaveBeenCalledWith(`/talents/${talentId}`)
    expect(revalidatePath).toHaveBeenCalledWith('/talents')
    expect(revalidateTags).toHaveBeenCalledWith(['talents', 'videos'])
  })

  it('should return channel not found when YouTube API returns no channels', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getChannels } = await import('@shinju-date/youtube-api-client')

    const mockSupabaseClient = {
      from: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: talentId,
            name: 'Some Talent',
            youtube_channels: [
              {
                id: channelRowId,
                youtube_channel_id: youtubeChannelId,
              },
            ],
          },
          error: null,
        }),
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    async function* emptyChannels() {
      // no yield
    }

    vi.mocked(getChannels).mockReturnValue(emptyChannels() as never)

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({
      error:
        'YouTubeでチャンネルが見つかりませんでした。チャンネルIDが正しいか確認してください。',
      success: false,
    })
  })

  it('should return error when snippet title is missing', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getChannels } = await import('@shinju-date/youtube-api-client')

    const mockSupabaseClient = {
      from: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: talentId,
            name: 'Some Talent',
            youtube_channels: [
              {
                id: channelRowId,
                youtube_channel_id: youtubeChannelId,
              },
            ],
          },
          error: null,
        }),
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    async function* channelsWithoutTitle() {
      yield {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UUabcdefghijklmnopqrstuv',
          },
        },
        id: youtubeChannelId,
        snippet: {},
      }
    }

    vi.mocked(getChannels).mockReturnValue(channelsWithoutTitle() as never)

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({
      error: 'YouTubeからチャンネル情報を取得できませんでした。',
      success: false,
    })
  })

  it('should return error when talent has no linked YouTube channels', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getChannels } = await import('@shinju-date/youtube-api-client')

    const mockSupabaseClient = {
      from: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: talentId,
            name: 'Some Talent',
            youtube_channels: [],
          },
          error: null,
        }),
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({
      error: 'このタレントに紐づくYouTubeチャンネルはありません。',
      success: false,
    })
    expect(getChannels).not.toHaveBeenCalled()
  })
})
