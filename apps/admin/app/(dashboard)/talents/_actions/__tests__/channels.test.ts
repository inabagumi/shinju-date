import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addYouTubeChannelAction,
  removeYouTubeChannelAction,
} from '../channels'

// Mock dependencies
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

vi.mock('@shinju-date/youtube-api-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@shinju-date/youtube-api-client')>()
  return {
    ...actual,
    resolveYouTubeChannel: vi.fn(),
  }
})

const talentId = '123e4567-e89b-12d3-a456-426614174000'
const youtubeChannelId = 'UCabcdefghijklmnopqrstuv'

const mockYouTubeChannel = {
  contentDetails: {
    relatedPlaylists: {
      uploads: 'UUabcdefghijklmnopqrstuv',
    },
  },
  id: youtubeChannelId,
  snippet: {
    customUrl: '@example_handle',
    title: 'Example Channel',
  },
}

describe('addYouTubeChannelAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully add YouTube channel with name and handle from API', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')
    const { resolveYouTubeChannel } = await import(
      '@shinju-date/youtube-api-client'
    )

    vi.mocked(resolveYouTubeChannel).mockResolvedValue(
      mockYouTubeChannel as never,
    )

    let callCount = 0
    const mockInsert = vi.fn().mockReturnThis()
    const mockSupabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'youtube_channels' && callCount === 0) {
          callCount++
          return {
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            select: vi.fn().mockReturnThis(),
          }
        }
        if (table === 'youtube_channels' && callCount === 1) {
          callCount++
          return {
            insert: mockInsert.mockReturnValue({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'channel-123' },
                error: null,
              }),
            }),
          }
        }
        if (table === 'talents') {
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnThis(),
          }
        }
        return {}
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('talent_id', talentId)
    formData.append('youtube_channel_id', youtubeChannelId)

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({ success: true })
    expect(resolveYouTubeChannel).toHaveBeenCalledWith({
      id: youtubeChannelId,
      kind: 'id',
    })
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'Example Channel',
      talent_id: talentId,
      youtube_channel_id: youtubeChannelId,
      youtube_handle: '@example_handle',
    })
    expect(createAuditLog).toHaveBeenCalledWith(
      'YOUTUBE_CHANNEL_CREATE',
      'youtube_channels',
      'channel-123',
      {
        name: 'Example Channel',
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
        youtube_handle: '@example_handle',
      },
    )
    expect(revalidatePath).toHaveBeenCalledWith(`/talents/${talentId}`)
    expect(revalidatePath).toHaveBeenCalledWith('/talents')
    expect(revalidateTags).toHaveBeenCalledWith(['talents', 'videos'])
  })

  it('should resolve channel from handle input', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { resolveYouTubeChannel } = await import(
      '@shinju-date/youtube-api-client'
    )

    vi.mocked(resolveYouTubeChannel).mockResolvedValue(
      mockYouTubeChannel as never,
    )

    let callCount = 0
    const mockInsert = vi.fn().mockReturnThis()
    const mockSupabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'youtube_channels' && callCount === 0) {
          callCount++
          return {
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            select: vi.fn().mockReturnThis(),
          }
        }
        if (table === 'youtube_channels' && callCount === 1) {
          callCount++
          return {
            insert: mockInsert.mockReturnValue({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'channel-123' },
                error: null,
              }),
            }),
          }
        }
        if (table === 'talents') {
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnThis(),
          }
        }
        return {}
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('talent_id', talentId)
    formData.append(
      'youtube_channel_id',
      'https://www.youtube.com/@example_handle',
    )

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({ success: true })
    expect(resolveYouTubeChannel).toHaveBeenCalledWith({
      handle: 'example_handle',
      kind: 'handle',
    })
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'Example Channel',
      talent_id: talentId,
      youtube_channel_id: youtubeChannelId,
      youtube_handle: '@example_handle',
    })
  })

  it('should extract channel ID from channel URL', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { resolveYouTubeChannel } = await import(
      '@shinju-date/youtube-api-client'
    )

    vi.mocked(resolveYouTubeChannel).mockResolvedValue(
      mockYouTubeChannel as never,
    )

    let callCount = 0
    const mockSupabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'youtube_channels' && callCount === 0) {
          callCount++
          return {
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            select: vi.fn().mockReturnThis(),
          }
        }
        if (table === 'youtube_channels' && callCount === 1) {
          callCount++
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'channel-123' },
              error: null,
            }),
          }
        }
        if (table === 'talents') {
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnThis(),
          }
        }
        return {}
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('talent_id', talentId)
    formData.append(
      'youtube_channel_id',
      `https://www.youtube.com/channel/${youtubeChannelId}`,
    )

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({ success: true })
    expect(resolveYouTubeChannel).toHaveBeenCalledWith({
      id: youtubeChannelId,
      kind: 'id',
    })
  })

  it('should return error when talent_id is missing', async () => {
    const formData = new FormData()
    formData.append('youtube_channel_id', youtubeChannelId)

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({
      errors: {
        generic: ['タレントIDが指定されていません。'],
      },
    })
  })

  it('should return error when youtube_channel_id is missing', async () => {
    const formData = new FormData()
    formData.append('talent_id', talentId)
    formData.append('youtube_channel_id', '')

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({
      errors: {
        youtube_channel_id: [
          'YouTubeチャンネルID、ハンドル、またはURLを入力してください。',
        ],
      },
    })
  })

  it('should return error for invalid youtube_channel_id format', async () => {
    const formData = new FormData()
    formData.append('talent_id', talentId)
    // Too short for a handle; not a UC channel ID
    formData.append('youtube_channel_id', 'ab')

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({
      errors: {
        youtube_channel_id: [
          '有効なチャンネルID（UC...）、ハンドル（@name）、またはYouTube URLを入力してください。',
        ],
      },
    })
  })

  it('should return error when YouTube channel is not found', async () => {
    const { resolveYouTubeChannel } = await import(
      '@shinju-date/youtube-api-client'
    )

    vi.mocked(resolveYouTubeChannel).mockResolvedValue(null)

    const formData = new FormData()
    formData.append('talent_id', talentId)
    formData.append('youtube_channel_id', '@missing_handle')

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({
      errors: {
        youtube_channel_id: [
          'YouTubeでチャンネルが見つかりませんでした。入力内容を確認してください。',
        ],
      },
    })
  })

  it('should return error when API key is missing', async () => {
    const { resolveYouTubeChannel } = await import(
      '@shinju-date/youtube-api-client'
    )

    vi.mocked(resolveYouTubeChannel).mockRejectedValue(
      new TypeError('An API Key is required.'),
    )

    const formData = new FormData()
    formData.append('talent_id', talentId)
    formData.append('youtube_channel_id', youtubeChannelId)

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({
      errors: {
        generic: [
          'YouTube APIキーが設定されていません。管理者に連絡してください。',
        ],
      },
    })
  })

  it('should return error when channel already exists for this talent', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { resolveYouTubeChannel } = await import(
      '@shinju-date/youtube-api-client'
    )

    vi.mocked(resolveYouTubeChannel).mockResolvedValue(
      mockYouTubeChannel as never,
    )

    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'existing-channel', talent_id: talentId },
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('talent_id', talentId)
    formData.append('youtube_channel_id', youtubeChannelId)

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({
      errors: {
        youtube_channel_id: ['このチャンネルは既に登録されています。'],
      },
    })
  })

  it('should return error when channel belongs to another talent', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { resolveYouTubeChannel } = await import(
      '@shinju-date/youtube-api-client'
    )

    vi.mocked(resolveYouTubeChannel).mockResolvedValue(
      mockYouTubeChannel as never,
    )

    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'existing-channel',
          talent_id: 'other-talent-id',
        },
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('talent_id', talentId)
    formData.append('youtube_channel_id', youtubeChannelId)

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({
      errors: {
        youtube_channel_id: [
          'このチャンネルは別のタレントに既に登録されています。',
        ],
      },
    })
  })
})

describe('removeYouTubeChannelAction', () => {
  it('should successfully remove YouTube channel', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')

    let callCount = 0
    const mockSupabaseClient = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'youtube_channels' && callCount === 0) {
          callCount++
          return {
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { youtube_channel_id: youtubeChannelId },
              error: null,
            }),
          }
        }
        if (table === 'youtube_channels' && callCount === 1) {
          callCount++
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          }
        }
        if (table === 'talents') {
          return {
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: vi.fn().mockReturnThis(),
          }
        }
        return mockSupabaseClient
      }),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { youtube_channel_id: youtubeChannelId },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await removeYouTubeChannelAction('channel-123', talentId)

    expect(result).toEqual({ success: true })
    expect(createAuditLog).toHaveBeenCalledWith(
      'YOUTUBE_CHANNEL_DELETE',
      'youtube_channels',
      'channel-123',
      {
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
      },
    )
    expect(revalidatePath).toHaveBeenCalledWith(`/talents/${talentId}`)
    expect(revalidatePath).toHaveBeenCalledWith('/talents')
    expect(revalidateTags).toHaveBeenCalledWith(['talents', 'videos'])
  })

  it('should return error when channel is not found (PGRST116)', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { logger } = await import('@shinju-date/logger')

    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'The result contains 0 rows',
        },
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await removeYouTubeChannelAction('channel-123', talentId)

    expect(result).toEqual({
      error:
        '指定されたチャンネルが見つかりません。既に削除されているか、存在しないIDが指定されています。',
      success: false,
    })
    expect(logger.warn).toHaveBeenCalledWith(
      '削除対象のチャンネルが見つかりませんでした',
      {
        channel_id: 'channel-123',
        talent_id: talentId,
      },
    )
  })

  it('should return error when channelId or talentId is missing', async () => {
    const result1 = await removeYouTubeChannelAction('', 'talent-id')
    expect(result1).toEqual({
      error: 'チャンネルIDまたはタレントIDが指定されていません。',
      success: false,
    })

    const result2 = await removeYouTubeChannelAction('channel-id', '')
    expect(result2).toEqual({
      error: 'チャンネルIDまたはタレントIDが指定されていません。',
      success: false,
    })
  })

  it('should handle delete operation errors', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { logger } = await import('@shinju-date/logger')

    let callCount = 0
    const mockSupabaseClient = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'youtube_channels' && callCount === 0) {
          callCount++
          return {
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { youtube_channel_id: youtubeChannelId },
              error: null,
            }),
          }
        }
        if (table === 'youtube_channels' && callCount === 1) {
          callCount++
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Delete failed' },
            }),
          }
        }
        return mockSupabaseClient
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await removeYouTubeChannelAction('channel-123', talentId)

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(logger.error).toHaveBeenCalled()
  })
})
