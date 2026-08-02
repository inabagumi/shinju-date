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
const channelRowId2 = 'channel-row-uuid-2'
const youtubeChannelId = 'UCabcdefghijklmnopqrstuv'
const youtubeChannelId2 = 'UCabcdefghijklmnopqrstuw'

function createMockSupabaseClient({
  channels,
  upsertError = null,
  updateError = null,
}: {
  channels: {
    id: string
    name: string | null
    youtube_channel_id: string
    youtube_handle: string | null
  }[]
  upsertError?: { message: string } | null
  updateError?: { message: string } | null
}) {
  const mockUpsert = vi.fn().mockResolvedValue({ error: upsertError })
  const mockUpdate = vi.fn().mockReturnThis()
  const mockEq = vi.fn().mockResolvedValue({ error: updateError })

  mockUpdate.mockReturnValue({ eq: mockEq })

  const mockSupabaseClient = {
    from: vi.fn((table: string) => {
      if (table === 'talents') {
        return {
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: talentId,
              youtube_channels: channels,
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

  return { mockEq, mockSupabaseClient, mockUpdate, mockUpsert }
}

describe('syncTalentWithYouTube', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update channel name and handle from YouTube snippet', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')
    const { getChannels } = await import('@shinju-date/youtube-api-client')

    const { mockSupabaseClient, mockUpdate, mockUpsert } =
      createMockSupabaseClient({
        channels: [
          {
            id: channelRowId,
            name: 'Old Channel Name',
            youtube_channel_id: youtubeChannelId,
            youtube_handle: '@oldhandle',
          },
        ],
      })

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
        name: 'New Channel Name',
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
        youtube_handle: '@newhandle',
      },
      { onConflict: 'id' },
    )
    // Talent name is not updated; only updated_at is touched
    expect(mockUpdate).toHaveBeenCalledWith({
      updated_at: '2024-11-24T17:00:00Z',
    })
    expect(createAuditLog).toHaveBeenCalledWith(
      'CHANNEL_SYNC',
      'channels',
      talentId,
      {
        channels: [
          {
            after: {
              name: 'New Channel Name',
              youtube_handle: '@newhandle',
            },
            before: {
              name: 'Old Channel Name',
              youtube_handle: '@oldhandle',
            },
            youtube_channel_id: youtubeChannelId,
          },
        ],
      },
    )
    expect(revalidatePath).toHaveBeenCalledWith(`/talents/${talentId}`)
    expect(revalidatePath).toHaveBeenCalledWith('/talents')
    expect(revalidateTags).toHaveBeenCalledWith(['talents', 'videos'])
  })

  it('should sync all linked YouTube channels', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { getChannels } = await import('@shinju-date/youtube-api-client')

    const { mockSupabaseClient, mockUpsert } = createMockSupabaseClient({
      channels: [
        {
          id: channelRowId,
          name: 'Channel A',
          youtube_channel_id: youtubeChannelId,
          youtube_handle: '@channela',
        },
        {
          id: channelRowId2,
          name: null,
          youtube_channel_id: youtubeChannelId2,
          youtube_handle: null,
        },
      ],
    })

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
          customUrl: '@channela-updated',
          title: 'Channel A Updated',
        },
      }
      yield {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UUabcdefghijklmnopqrstuw',
          },
        },
        id: youtubeChannelId2,
        snippet: {
          customUrl: '@channelb',
          title: 'Channel B',
        },
      }
    }

    vi.mocked(getChannels).mockReturnValue(mockGetChannels() as never)

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({ success: true })
    expect(getChannels).toHaveBeenCalledWith({
      ids: [youtubeChannelId, youtubeChannelId2],
    })
    expect(mockUpsert).toHaveBeenCalledTimes(2)
    expect(mockUpsert).toHaveBeenNthCalledWith(
      1,
      {
        id: channelRowId,
        name: 'Channel A Updated',
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
        youtube_handle: '@channela-updated',
      },
      { onConflict: 'id' },
    )
    expect(mockUpsert).toHaveBeenNthCalledWith(
      2,
      {
        id: channelRowId2,
        name: 'Channel B',
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId2,
        youtube_handle: '@channelb',
      },
      { onConflict: 'id' },
    )
    expect(createAuditLog).toHaveBeenCalledWith(
      'CHANNEL_SYNC',
      'channels',
      talentId,
      {
        channels: [
          {
            after: {
              name: 'Channel A Updated',
              youtube_handle: '@channela-updated',
            },
            before: {
              name: 'Channel A',
              youtube_handle: '@channela',
            },
            youtube_channel_id: youtubeChannelId,
          },
          {
            after: {
              name: 'Channel B',
              youtube_handle: '@channelb',
            },
            before: {
              name: null,
              youtube_handle: null,
            },
            youtube_channel_id: youtubeChannelId2,
          },
        ],
      },
    )
  })

  it('should update found channels when some are missing on YouTube', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getChannels } = await import('@shinju-date/youtube-api-client')
    const { logger } = await import('@shinju-date/logger')

    const { mockSupabaseClient, mockUpsert } = createMockSupabaseClient({
      channels: [
        {
          id: channelRowId,
          name: 'Channel A',
          youtube_channel_id: youtubeChannelId,
          youtube_handle: '@channela',
        },
        {
          id: channelRowId2,
          name: 'Missing Channel',
          youtube_channel_id: youtubeChannelId2,
          youtube_handle: '@missing',
        },
      ],
    })

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
          customUrl: '@channela-new',
          title: 'Channel A New',
        },
      }
    }

    vi.mocked(getChannels).mockReturnValue(mockGetChannels() as never)

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({ success: true })
    expect(mockUpsert).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      'YouTubeでチャンネルが見つかりませんでした',
      {
        talentId,
        youtubeChannelId: youtubeChannelId2,
      },
    )
  })

  it('should return already up to date when channel data is unchanged', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getChannels } = await import('@shinju-date/youtube-api-client')
    const { createAuditLog } = await import('@/lib/audit-log')

    const { mockSupabaseClient, mockUpsert, mockUpdate } =
      createMockSupabaseClient({
        channels: [
          {
            id: channelRowId,
            name: 'Same Name',
            youtube_channel_id: youtubeChannelId,
            youtube_handle: '@same',
          },
        ],
      })

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
          customUrl: '@same',
          title: 'Same Name',
        },
      }
    }

    vi.mocked(getChannels).mockReturnValue(mockGetChannels() as never)

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({
      message: 'チャンネル情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    // Still upserts (idempotent write) but does not touch talent or audit
    expect(mockUpsert).toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(createAuditLog).not.toHaveBeenCalled()
  })

  it('should return channel not found when YouTube API returns no channels', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getChannels } = await import('@shinju-date/youtube-api-client')

    const { mockSupabaseClient } = createMockSupabaseClient({
      channels: [
        {
          id: channelRowId,
          name: null,
          youtube_channel_id: youtubeChannelId,
          youtube_handle: null,
        },
      ],
    })

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

  it('should return error when snippet title is missing for all channels', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getChannels } = await import('@shinju-date/youtube-api-client')

    const { mockSupabaseClient } = createMockSupabaseClient({
      channels: [
        {
          id: channelRowId,
          name: null,
          youtube_channel_id: youtubeChannelId,
          youtube_handle: null,
        },
      ],
    })

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
      error:
        'YouTubeでチャンネルが見つかりませんでした。チャンネルIDが正しいか確認してください。',
      success: false,
    })
  })

  it('should return error when talent has no linked YouTube channels', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getChannels } = await import('@shinju-date/youtube-api-client')

    const { mockSupabaseClient } = createMockSupabaseClient({
      channels: [],
    })

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
