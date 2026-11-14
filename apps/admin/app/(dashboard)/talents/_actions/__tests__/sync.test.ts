import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  syncTalentAccounts,
  syncTalentWithTwitch,
  syncTalentWithYouTube,
} from '../sync'

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
  toDBString: vi.fn((instant) => instant.toString()),
}))

vi.mock('temporal-polyfill', () => ({
  Temporal: {
    Instant: {
      from: vi.fn((value: string) => ({
        equals: (other: { toString: () => string }) =>
          value === other.toString(),
        toString: () => value,
      })),
    },
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

vi.mock('@shinju-date/twitch-api-client', () => ({
  getUsers: vi.fn(),
}))

// アイコンの同期は service role を使うため、ここではモックして呼び出し内容だけを確認する
vi.mock('@/lib/youtube-channel-icon', () => ({
  hasProfileImageChanged: (result: string | null) =>
    result !== null && result !== 'unchanged',
  syncYouTubeChannelIconSafely: vi.fn().mockResolvedValue('unchanged'),
}))

vi.mock('@/lib/twitch-user-icon', () => ({
  syncTwitchUserIconSafely: vi.fn().mockResolvedValue('unchanged'),
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
    profile_images?: null
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

  it('should select the saved icon of each channel', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getChannels } = await import('@shinju-date/youtube-api-client')

    const { mockSupabaseClient } = createMockSupabaseClient({ channels: [] })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )
    vi.mocked(getChannels).mockReturnValue((async function* () {})() as never)

    await syncTalentWithYouTube(talentId)

    const talentsQuery = mockSupabaseClient.from.mock.results[0]?.value as {
      select: ReturnType<typeof vi.fn>
    }

    expect(talentsQuery.select).toHaveBeenCalledWith(
      expect.stringContaining('profile_images(id, path, etag, source_url)'),
    )
  })

  it('should record a changed icon even when name and handle are unchanged', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getChannels } = await import('@shinju-date/youtube-api-client')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { syncYouTubeChannelIconSafely } = await import(
      '@/lib/youtube-channel-icon'
    )

    const savedChannel = {
      id: channelRowId,
      name: 'Same Name',
      profile_images: null,
      youtube_channel_id: youtubeChannelId,
      youtube_handle: '@same',
    }
    const youtubeChannel = {
      contentDetails: {
        relatedPlaylists: { uploads: 'UUabcdefghijklmnopqrstuv' },
      },
      id: youtubeChannelId,
      snippet: {
        customUrl: '@same',
        thumbnails: {
          high: { height: 800, url: 'https://yt3.ggpht.com/a', width: 800 },
        },
        title: 'Same Name',
      },
    }
    const { mockSupabaseClient, mockUpdate } = createMockSupabaseClient({
      channels: [savedChannel],
    })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )
    vi.mocked(getChannels).mockReturnValue(
      (async function* () {
        yield youtubeChannel
      })() as never,
    )
    vi.mocked(syncYouTubeChannelIconSafely).mockResolvedValueOnce('created')

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({ success: true })
    expect(syncYouTubeChannelIconSafely).toHaveBeenCalledWith(
      youtubeChannel,
      savedChannel,
    )
    expect(mockUpdate).toHaveBeenCalled()
    expect(createAuditLog).toHaveBeenCalledWith(
      'CHANNEL_SYNC',
      'channels',
      talentId,
      {
        channels: [
          {
            after: { name: 'Same Name', youtube_handle: '@same' },
            before: { name: 'Same Name', youtube_handle: '@same' },
            profile_image: 'created',
            youtube_channel_id: youtubeChannelId,
          },
        ],
      },
    )
  })

  it('should still sync name and handle when the icon cannot be synced', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getChannels } = await import('@shinju-date/youtube-api-client')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { syncYouTubeChannelIconSafely } = await import(
      '@/lib/youtube-channel-icon'
    )

    const { mockSupabaseClient, mockUpsert } = createMockSupabaseClient({
      channels: [
        {
          id: channelRowId,
          name: 'Old Name',
          profile_images: null,
          youtube_channel_id: youtubeChannelId,
          youtube_handle: '@old',
        },
      ],
    })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )
    vi.mocked(getChannels).mockReturnValue(
      (async function* () {
        yield {
          contentDetails: {
            relatedPlaylists: { uploads: 'UUabcdefghijklmnopqrstuv' },
          },
          id: youtubeChannelId,
          snippet: { customUrl: '@new', title: 'New Name' },
        }
      })() as never,
    )
    // 失敗時はヘルパーがログに記録して null を返す
    vi.mocked(syncYouTubeChannelIconSafely).mockResolvedValueOnce(null)

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({ success: true })
    expect(mockUpsert).toHaveBeenCalled()
    expect(createAuditLog).toHaveBeenCalledWith(
      'CHANNEL_SYNC',
      'channels',
      talentId,
      {
        channels: [
          {
            after: { name: 'New Name', youtube_handle: '@new' },
            before: { name: 'Old Name', youtube_handle: '@old' },
            youtube_channel_id: youtubeChannelId,
          },
        ],
      },
    )
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

const twitchUserRowId = 'twitch-user-row-uuid'
const twitchUserId = '141981764'

function createMockTwitchSupabaseClient({
  users,
  upsertError = null,
  updateError = null,
}: {
  users: {
    id: string
    name: string | null
    profile_images?: null
    twitch_user_id: string
    twitch_login_name: string | null
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
              twitch_users: users,
            },
            error: null,
          }),
          update: mockUpdate,
        }
      }

      if (table === 'twitch_users') {
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

describe('syncTalentWithTwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update twitch user name and login from Helix API', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { getUsers } = await import('@shinju-date/twitch-api-client')

    const { mockSupabaseClient, mockUpdate, mockUpsert } =
      createMockTwitchSupabaseClient({
        users: [
          {
            id: twitchUserRowId,
            name: 'Old Name',
            twitch_login_name: 'oldlogin',
            twitch_user_id: twitchUserId,
          },
        ],
      })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    async function* mockGetUsers() {
      yield {
        broadcaster_type: '',
        created_at: '2011-08-08T20:45:44Z',
        description: '',
        display_name: 'New Name',
        id: twitchUserId,
        login: 'newlogin',
        offline_image_url: '',
        profile_image_url: '',
        type: '',
      }
    }

    vi.mocked(getUsers).mockReturnValue(mockGetUsers() as never)

    const result = await syncTalentWithTwitch(talentId)

    expect(result).toEqual({ success: true })
    expect(getUsers).toHaveBeenCalledWith({ ids: [twitchUserId] })
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        id: twitchUserRowId,
        name: 'New Name',
        talent_id: talentId,
        twitch_login_name: 'newlogin',
        twitch_user_id: twitchUserId,
      },
      { onConflict: 'id' },
    )
    expect(mockUpdate).toHaveBeenCalledWith({
      updated_at: '2024-11-24T17:00:00Z',
    })
    expect(createAuditLog).toHaveBeenCalledWith(
      'CHANNEL_SYNC',
      'twitch_users',
      talentId,
      {
        platform: 'twitch',
        users: [
          {
            after: {
              name: 'New Name',
              twitch_login_name: 'newlogin',
            },
            before: {
              name: 'Old Name',
              twitch_login_name: 'oldlogin',
            },
            twitch_user_id: twitchUserId,
          },
        ],
      },
    )
  })

  it('should return already up to date when user data is unchanged', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getUsers } = await import('@shinju-date/twitch-api-client')
    const { createAuditLog } = await import('@/lib/audit-log')

    const { mockSupabaseClient, mockUpsert, mockUpdate } =
      createMockTwitchSupabaseClient({
        users: [
          {
            id: twitchUserRowId,
            name: 'Same Name',
            twitch_login_name: 'samelogin',
            twitch_user_id: twitchUserId,
          },
        ],
      })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    async function* mockGetUsers() {
      yield {
        broadcaster_type: '',
        created_at: '2011-08-08T20:45:44Z',
        description: '',
        display_name: 'Same Name',
        id: twitchUserId,
        login: 'samelogin',
        offline_image_url: '',
        profile_image_url: '',
        type: '',
      }
    }

    vi.mocked(getUsers).mockReturnValue(mockGetUsers() as never)

    const result = await syncTalentWithTwitch(talentId)

    expect(result).toEqual({
      message: 'Twitchユーザー情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    expect(mockUpsert).toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(createAuditLog).not.toHaveBeenCalled()
  })

  it('should select the saved icon of each Twitch user', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')

    const { mockSupabaseClient } = createMockTwitchSupabaseClient({
      users: [],
    })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    await syncTalentWithTwitch(talentId)

    const talentsQuery = mockSupabaseClient.from.mock.results[0]?.value as {
      select: ReturnType<typeof vi.fn>
    }

    expect(talentsQuery.select).toHaveBeenCalledWith(
      expect.stringContaining('profile_images(id, path, etag, source_url)'),
    )
  })

  it('should record a changed icon even when name and login are unchanged', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getUsers } = await import('@shinju-date/twitch-api-client')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { syncTwitchUserIconSafely } = await import('@/lib/twitch-user-icon')

    const savedUser = {
      id: twitchUserRowId,
      name: 'Same Name',
      profile_images: null,
      twitch_login_name: 'samelogin',
      twitch_user_id: twitchUserId,
    }
    const twitchUser = {
      broadcaster_type: '',
      created_at: '2011-08-08T20:45:44Z',
      description: '',
      display_name: 'Same Name',
      id: twitchUserId,
      login: 'samelogin',
      offline_image_url: '',
      profile_image_url:
        'https://static-cdn.jtvnw.net/jtv_user_pictures/same-profile_image-300x300.png',
      type: '',
    }
    const { mockSupabaseClient, mockUpdate } = createMockTwitchSupabaseClient({
      users: [savedUser],
    })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )
    vi.mocked(getUsers).mockReturnValue(
      (async function* () {
        yield twitchUser
      })() as never,
    )
    vi.mocked(syncTwitchUserIconSafely).mockResolvedValueOnce('replaced')

    const result = await syncTalentWithTwitch(talentId)

    expect(result).toEqual({ success: true })
    expect(syncTwitchUserIconSafely).toHaveBeenCalledWith(twitchUser, savedUser)
    expect(mockUpdate).toHaveBeenCalled()
    expect(createAuditLog).toHaveBeenCalledWith(
      'CHANNEL_SYNC',
      'twitch_users',
      talentId,
      {
        platform: 'twitch',
        users: [
          {
            after: { name: 'Same Name', twitch_login_name: 'samelogin' },
            before: { name: 'Same Name', twitch_login_name: 'samelogin' },
            profile_image: 'replaced',
            twitch_user_id: twitchUserId,
          },
        ],
      },
    )
  })

  it('should still sync name and login when the icon cannot be synced', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getUsers } = await import('@shinju-date/twitch-api-client')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { syncTwitchUserIconSafely } = await import('@/lib/twitch-user-icon')

    const { mockSupabaseClient, mockUpsert } = createMockTwitchSupabaseClient({
      users: [
        {
          id: twitchUserRowId,
          name: 'Old Name',
          profile_images: null,
          twitch_login_name: 'oldlogin',
          twitch_user_id: twitchUserId,
        },
      ],
    })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )
    vi.mocked(getUsers).mockReturnValue(
      (async function* () {
        yield {
          broadcaster_type: '',
          created_at: '2011-08-08T20:45:44Z',
          description: '',
          display_name: 'New Name',
          id: twitchUserId,
          login: 'newlogin',
          offline_image_url: '',
          profile_image_url:
            'https://static-cdn.jtvnw.net/jtv_user_pictures/new-profile_image-300x300.png',
          type: '',
        }
      })() as never,
    )
    // 失敗時はヘルパーがログに記録して null を返す
    vi.mocked(syncTwitchUserIconSafely).mockResolvedValueOnce(null)

    const result = await syncTalentWithTwitch(talentId)

    expect(result).toEqual({ success: true })
    expect(mockUpsert).toHaveBeenCalled()
    expect(createAuditLog).toHaveBeenCalledWith(
      'CHANNEL_SYNC',
      'twitch_users',
      talentId,
      {
        platform: 'twitch',
        users: [
          {
            after: { name: 'New Name', twitch_login_name: 'newlogin' },
            before: { name: 'Old Name', twitch_login_name: 'oldlogin' },
            twitch_user_id: twitchUserId,
          },
        ],
      },
    )
  })

  it('should still sync the icon when name and login cannot be written', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getUsers } = await import('@shinju-date/twitch-api-client')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { syncTwitchUserIconSafely } = await import('@/lib/twitch-user-icon')

    const savedUser = {
      id: twitchUserRowId,
      name: 'Old Name',
      profile_images: null,
      twitch_login_name: 'oldlogin',
      twitch_user_id: twitchUserId,
    }
    const twitchUser = {
      broadcaster_type: '',
      created_at: '2011-08-08T20:45:44Z',
      description: '',
      display_name: 'New Name',
      id: twitchUserId,
      login: 'newlogin',
      offline_image_url: '',
      profile_image_url:
        'https://static-cdn.jtvnw.net/jtv_user_pictures/new-profile_image-300x300.png',
      type: '',
    }
    const { mockSupabaseClient, mockUpdate } = createMockTwitchSupabaseClient({
      upsertError: { message: 'duplicate key value' },
      users: [savedUser],
    })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )
    vi.mocked(getUsers).mockReturnValue(
      (async function* () {
        yield twitchUser
      })() as never,
    )
    vi.mocked(syncTwitchUserIconSafely).mockResolvedValueOnce('created')

    const result = await syncTalentWithTwitch(talentId)

    expect(result).toEqual({ success: true })
    expect(syncTwitchUserIconSafely).toHaveBeenCalledWith(twitchUser, savedUser)
    expect(mockUpdate).toHaveBeenCalled()
    // name / login は書き込めていないので、監査ログにはアイコンの変更だけを残す
    expect(createAuditLog).toHaveBeenCalledWith(
      'CHANNEL_SYNC',
      'twitch_users',
      talentId,
      {
        platform: 'twitch',
        users: [{ profile_image: 'created', twitch_user_id: twitchUserId }],
      },
    )
  })

  it.each([
    ['cannot be synced', null],
    ['is unchanged', 'unchanged'],
  ] as const)(
    'should fail when name and login cannot be written and the icon %s',
    async (_, iconResult) => {
      const { createSupabaseServerClient } = await import('@/lib/supabase')
      const { getUsers } = await import('@shinju-date/twitch-api-client')
      const { createAuditLog } = await import('@/lib/audit-log')
      const { syncTwitchUserIconSafely } = await import(
        '@/lib/twitch-user-icon'
      )

      const { mockSupabaseClient } = createMockTwitchSupabaseClient({
        upsertError: { message: 'duplicate key value' },
        users: [
          {
            id: twitchUserRowId,
            name: 'Old Name',
            profile_images: null,
            twitch_login_name: 'oldlogin',
            twitch_user_id: twitchUserId,
          },
        ],
      })

      vi.mocked(createSupabaseServerClient).mockResolvedValue(
        mockSupabaseClient as never,
      )
      vi.mocked(getUsers).mockReturnValue(
        (async function* () {
          yield {
            broadcaster_type: '',
            created_at: '2011-08-08T20:45:44Z',
            description: '',
            display_name: 'New Name',
            id: twitchUserId,
            login: 'newlogin',
            offline_image_url: '',
            profile_image_url: '',
            type: '',
          }
        })() as never,
      )
      vi.mocked(syncTwitchUserIconSafely).mockResolvedValueOnce(iconResult)

      const result = await syncTalentWithTwitch(talentId)

      // アイコンが変わっていなければ、書き込めなかった name / login を「最新」と報告しない
      expect(result).toEqual({
        error:
          'Twitchでユーザーが見つかりませんでした。ユーザーIDが正しいか確認してください。',
        success: false,
      })
      expect(createAuditLog).not.toHaveBeenCalled()
    },
  )

  it('should return error when talent has no linked Twitch users', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getUsers } = await import('@shinju-date/twitch-api-client')

    const { mockSupabaseClient } = createMockTwitchSupabaseClient({
      users: [],
    })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await syncTalentWithTwitch(talentId)

    expect(result).toEqual({
      error: 'このタレントに紐づくTwitchユーザーはありません。',
      success: false,
    })
    expect(getUsers).not.toHaveBeenCalled()
  })
})

function createMockAccountsSupabaseClient({
  channels,
  users,
}: {
  channels: {
    id: string
    name: string | null
    profile_images?: {
      etag: string | null
      id: string
      path: string
      source_url: string
    } | null
    youtube_channel_id: string
    youtube_handle: string | null
  }[]
  users: {
    id: string
    name: string | null
    twitch_user_id: string
    twitch_login_name: string | null
  }[]
}) {
  const mockYouTubeUpsert = vi.fn().mockResolvedValue({ error: null })
  const mockTwitchUpsert = vi.fn().mockResolvedValue({ error: null })
  const mockEq = vi.fn().mockResolvedValue({ error: null })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })

  const mockSupabaseClient = {
    from: vi.fn((table: string) => {
      if (table === 'talents') {
        return {
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: talentId,
              twitch_users: users,
              youtube_channels: channels,
            },
            error: null,
          }),
          update: mockUpdate,
        }
      }

      if (table === 'youtube_channels') {
        return { upsert: mockYouTubeUpsert }
      }

      if (table === 'twitch_users') {
        return { upsert: mockTwitchUpsert }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  return { mockSupabaseClient, mockTwitchUpsert, mockYouTubeUpsert }
}

function helixUser(displayName: string, login: string) {
  return {
    broadcaster_type: '',
    created_at: '2011-08-08T20:45:44Z',
    description: '',
    display_name: displayName,
    id: twitchUserId,
    login,
    offline_image_url: '',
    profile_image_url: '',
    type: '',
  }
}

function youtubeChannel(title: string, customUrl: string) {
  return {
    contentDetails: {
      relatedPlaylists: {
        uploads: 'UUabcdefghijklmnopqrstuv',
      },
    },
    id: youtubeChannelId,
    snippet: { customUrl, title },
  }
}

describe('syncTalentAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should include the saved YouTube icon when syncing both platforms', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { syncYouTubeChannelIconSafely } = await import(
      '@/lib/youtube-channel-icon'
    )
    const { getChannels } = await import('@shinju-date/youtube-api-client')
    const { getUsers } = await import('@shinju-date/twitch-api-client')
    const channel = {
      id: channelRowId,
      name: 'Same Name',
      profile_images: {
        etag: 'etag',
        id: 'image-id',
        path: 'image-path',
        source_url: 'https://example.com/image',
      },
      youtube_channel_id: youtubeChannelId,
      youtube_handle: '@same',
    }
    const { mockSupabaseClient, mockTwitchUpsert } =
      createMockAccountsSupabaseClient({
        channels: [channel],
        users: [
          {
            id: twitchUserRowId,
            name: 'Old Name',
            twitch_login_name: 'oldlogin',
            twitch_user_id: twitchUserId,
          },
        ],
      })
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    async function* mockGetChannels() {
      yield youtubeChannel('Same Name', '@same')
    }
    async function* mockGetUsers() {
      yield helixUser('New Name', 'newlogin')
    }
    vi.mocked(getChannels).mockReturnValue(mockGetChannels() as never)
    vi.mocked(getUsers).mockReturnValue(mockGetUsers() as never)
    vi.mocked(syncYouTubeChannelIconSafely).mockResolvedValueOnce('replaced')

    const result = await syncTalentAccounts(talentId)

    const talentsQuery = mockSupabaseClient.from.mock.results[0]?.value as {
      select: ReturnType<typeof vi.fn>
    }
    expect(talentsQuery.select).toHaveBeenCalledWith(
      expect.stringContaining('profile_images(id, path, etag, source_url)'),
    )
    expect(syncYouTubeChannelIconSafely).toHaveBeenCalledWith(
      expect.objectContaining({ id: youtubeChannelId }),
      channel,
    )
    expect(mockTwitchUpsert).toHaveBeenCalled()
    expect(result).toEqual({
      message:
        'YouTube: チャンネル情報を同期しました。\nTwitch: ユーザー情報を同期しました。',
      success: true,
      unchanged: false,
    })
  })

  it('should sync a talent that only has a Twitch user', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { getChannels } = await import('@shinju-date/youtube-api-client')
    const { getUsers } = await import('@shinju-date/twitch-api-client')

    const { mockSupabaseClient, mockTwitchUpsert } =
      createMockAccountsSupabaseClient({
        channels: [],
        users: [
          {
            id: twitchUserRowId,
            name: 'Old Name',
            twitch_login_name: 'oldlogin',
            twitch_user_id: twitchUserId,
          },
        ],
      })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    async function* mockGetUsers() {
      yield helixUser('New Name', 'newlogin')
    }

    vi.mocked(getUsers).mockReturnValue(mockGetUsers() as never)

    const result = await syncTalentAccounts(talentId)

    expect(result).toEqual({
      message: 'Twitch: ユーザー情報を同期しました。',
      success: true,
      unchanged: false,
    })
    expect(getChannels).not.toHaveBeenCalled()
    expect(mockTwitchUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Name',
        twitch_login_name: 'newlogin',
      }),
      { onConflict: 'id' },
    )
    expect(createAuditLog).toHaveBeenCalledWith(
      'CHANNEL_SYNC',
      'twitch_users',
      talentId,
      expect.objectContaining({ platform: 'twitch' }),
    )
  })

  it('should keep the Twitch result when YouTube fails and report which one failed', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { getChannels } = await import('@shinju-date/youtube-api-client')
    const { getUsers } = await import('@shinju-date/twitch-api-client')

    const { mockSupabaseClient, mockTwitchUpsert, mockYouTubeUpsert } =
      createMockAccountsSupabaseClient({
        channels: [
          {
            id: channelRowId,
            name: 'Channel',
            youtube_channel_id: youtubeChannelId,
            youtube_handle: '@channel',
          },
        ],
        users: [
          {
            id: twitchUserRowId,
            name: 'Old Name',
            twitch_login_name: 'oldlogin',
            twitch_user_id: twitchUserId,
          },
        ],
      })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    // biome-ignore lint/correctness/useYield: throws before yielding
    async function* failingChannels(): AsyncGenerator<never> {
      throw new Error('quota exceeded')
    }

    async function* mockGetUsers() {
      yield helixUser('New Name', 'newlogin')
    }

    vi.mocked(getChannels).mockReturnValue(failingChannels() as never)
    vi.mocked(getUsers).mockReturnValue(mockGetUsers() as never)

    const result = await syncTalentAccounts(talentId)

    expect(result).toEqual({
      error:
        'YouTube: 同期に失敗しました。quota exceeded\nTwitch: ユーザー情報を同期しました。',
      success: false,
      unchanged: false,
    })
    expect(mockYouTubeUpsert).not.toHaveBeenCalled()
    expect(mockTwitchUpsert).toHaveBeenCalled()
    expect(createAuditLog).toHaveBeenCalledTimes(1)
    expect(createAuditLog).toHaveBeenCalledWith(
      'CHANNEL_SYNC',
      'twitch_users',
      talentId,
      expect.anything(),
    )
  })

  it('should report each platform when everything is up to date', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { getChannels } = await import('@shinju-date/youtube-api-client')
    const { getUsers } = await import('@shinju-date/twitch-api-client')

    const { mockSupabaseClient } = createMockAccountsSupabaseClient({
      channels: [
        {
          id: channelRowId,
          name: 'Same Name',
          youtube_channel_id: youtubeChannelId,
          youtube_handle: '@same',
        },
      ],
      users: [
        {
          id: twitchUserRowId,
          name: 'Same Name',
          twitch_login_name: 'samelogin',
          twitch_user_id: twitchUserId,
        },
      ],
    })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    async function* mockGetChannels() {
      yield youtubeChannel('Same Name', '@same')
    }

    async function* mockGetUsers() {
      yield helixUser('Same Name', 'samelogin')
    }

    vi.mocked(getChannels).mockReturnValue(mockGetChannels() as never)
    vi.mocked(getUsers).mockReturnValue(mockGetUsers() as never)

    const result = await syncTalentAccounts(talentId)

    expect(result).toEqual({
      message:
        'YouTube: チャンネル情報は既に最新です。\nTwitch: ユーザー情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    expect(createAuditLog).not.toHaveBeenCalled()
  })

  it('should return error when the talent has no accounts', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { getChannels } = await import('@shinju-date/youtube-api-client')
    const { getUsers } = await import('@shinju-date/twitch-api-client')

    const { mockSupabaseClient } = createMockAccountsSupabaseClient({
      channels: [],
      users: [],
    })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await syncTalentAccounts(talentId)

    expect(result).toEqual({
      error:
        'このタレントに紐づくYouTubeチャンネル・Twitchユーザーはありません。',
      success: false,
    })
    expect(getChannels).not.toHaveBeenCalled()
    expect(getUsers).not.toHaveBeenCalled()
  })
})
