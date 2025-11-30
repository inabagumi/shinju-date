import { describe, expect, it, vi } from 'vitest'
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

describe('addYouTubeChannelAction', () => {
  it('should successfully add YouTube channel', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')

    let callCount = 0
    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'channel-123' },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    }

    // Mock from() to return different chains based on table name
    mockSupabaseClient.from.mockImplementation((table: string) => {
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
      return mockSupabaseClient
    })

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('talent_id', '123e4567-e89b-12d3-a456-426614174000')
    formData.append('youtube_channel_id', 'UCabcdefghijklmnopqrstuv')

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({ success: true })
    expect(createAuditLog).toHaveBeenCalledWith(
      'YOUTUBE_CHANNEL_CREATE',
      'youtube_channels',
      'channel-123',
      {
        talent_id: '123e4567-e89b-12d3-a456-426614174000',
        youtube_channel_id: 'UCabcdefghijklmnopqrstuv',
      },
    )
    expect(revalidatePath).toHaveBeenCalledWith(
      '/talents/123e4567-e89b-12d3-a456-426614174000',
    )
    expect(revalidatePath).toHaveBeenCalledWith('/talents')
    expect(revalidateTags).toHaveBeenCalledWith(['talents', 'videos'])
  })

  it('should extract channel ID from URL', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')

    let callCount = 0
    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
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
        return mockSupabaseClient
      }),
      insert: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'channel-123' },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('talent_id', '123e4567-e89b-12d3-a456-426614174000')
    formData.append(
      'youtube_channel_id',
      'https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv',
    )

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({ success: true })
  })

  it('should return error when talent_id is missing', async () => {
    const formData = new FormData()
    formData.append('youtube_channel_id', 'UCabcdefghijklmnopqrstuv')

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({
      errors: {
        generic: ['タレントIDが指定されていません。'],
      },
    })
  })

  it('should return error when youtube_channel_id is missing', async () => {
    const formData = new FormData()
    formData.append('talent_id', '123e4567-e89b-12d3-a456-426614174000')
    formData.append('youtube_channel_id', '')

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({
      errors: {
        youtube_channel_id: [
          'YouTubeチャンネルIDまたはURLを入力してください。',
        ],
      },
    })
  })

  it('should return error for invalid youtube_channel_id format', async () => {
    const formData = new FormData()
    formData.append('talent_id', '123e4567-e89b-12d3-a456-426614174000')
    formData.append('youtube_channel_id', 'invalid-id')

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({
      errors: {
        youtube_channel_id: [
          '有効なYouTubeチャンネルID（UCで始まる24文字）を入力してください。',
        ],
      },
    })
  })

  it('should return error when channel already exists', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')

    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'existing-channel' },
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('talent_id', '123e4567-e89b-12d3-a456-426614174000')
    formData.append('youtube_channel_id', 'UCabcdefghijklmnopqrstuv')

    const result = await addYouTubeChannelAction({}, formData)

    expect(result).toEqual({
      errors: {
        youtube_channel_id: ['このチャンネルIDは既に登録されています。'],
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
              data: { youtube_channel_id: 'UCabcdefghijklmnopqrstuv' },
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
        data: { youtube_channel_id: 'UCabcdefghijklmnopqrstuv' },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await removeYouTubeChannelAction(
      'channel-123',
      '123e4567-e89b-12d3-a456-426614174000',
    )

    expect(result).toEqual({ success: true })
    expect(createAuditLog).toHaveBeenCalledWith(
      'YOUTUBE_CHANNEL_DELETE',
      'youtube_channels',
      'channel-123',
      {
        talent_id: '123e4567-e89b-12d3-a456-426614174000',
        youtube_channel_id: 'UCabcdefghijklmnopqrstuv',
      },
    )
    expect(revalidatePath).toHaveBeenCalledWith(
      '/talents/123e4567-e89b-12d3-a456-426614174000',
    )
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

    const result = await removeYouTubeChannelAction(
      'channel-123',
      '123e4567-e89b-12d3-a456-426614174000',
    )

    expect(result).toEqual({
      error:
        '指定されたチャンネルが見つかりません。既に削除されているか、存在しないIDが指定されています。',
      success: false,
    })
    expect(logger.warn).toHaveBeenCalledWith(
      '削除対象のチャンネルが見つかりませんでした',
      {
        channel_id: 'channel-123',
        talent_id: '123e4567-e89b-12d3-a456-426614174000',
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
              data: { youtube_channel_id: 'UCabcdefghijklmnopqrstuv' },
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

    const result = await removeYouTubeChannelAction(
      'channel-123',
      '123e4567-e89b-12d3-a456-426614174000',
    )

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(logger.error).toHaveBeenCalled()
  })
})
