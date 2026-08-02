import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addTwitchUserAction, removeTwitchUserAction } from '../twitch-users'

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

vi.mock('@shinju-date/twitch-api-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@shinju-date/twitch-api-client')>()
  return {
    ...actual,
    resolveTwitchUser: vi.fn(),
  }
})

const talentId = '123e4567-e89b-12d3-a456-426614174000'
const twitchUserId = '141981764'

const mockTwitchUser = {
  broadcaster_type: 'partner',
  created_at: '2011-08-08T20:45:44Z',
  description: '',
  display_name: 'ExampleUser',
  id: twitchUserId,
  login: 'exampleuser',
  offline_image_url: '',
  profile_image_url: '',
  type: '',
  view_count: 0,
}

describe('addTwitchUserAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully add Twitch user with name and login from API', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')
    const { resolveTwitchUser } = await import('@shinju-date/twitch-api-client')

    vi.mocked(resolveTwitchUser).mockResolvedValue(mockTwitchUser)

    let callCount = 0
    const mockInsert = vi.fn().mockReturnThis()
    const mockSupabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'twitch_users' && callCount === 0) {
          callCount++
          return {
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            select: vi.fn().mockReturnThis(),
          }
        }
        if (table === 'twitch_users' && callCount === 1) {
          callCount++
          return {
            insert: mockInsert.mockReturnValue({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'twitch-user-row-123' },
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
    formData.append('twitch_user', 'exampleuser')

    const result = await addTwitchUserAction({}, formData)

    expect(result).toEqual({ success: true })
    expect(resolveTwitchUser).toHaveBeenCalledWith({
      kind: 'login',
      login: 'exampleuser',
    })
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'ExampleUser',
      talent_id: talentId,
      twitch_login_name: 'exampleuser',
      twitch_user_id: twitchUserId,
    })
    expect(createAuditLog).toHaveBeenCalledWith(
      'TWITCH_USER_CREATE',
      'twitch_users',
      'twitch-user-row-123',
      {
        name: 'ExampleUser',
        talent_id: talentId,
        twitch_login_name: 'exampleuser',
        twitch_user_id: twitchUserId,
      },
    )
    expect(revalidatePath).toHaveBeenCalledWith(`/talents/${talentId}`)
    expect(revalidatePath).toHaveBeenCalledWith('/talents')
    expect(revalidateTags).toHaveBeenCalledWith(['talents', 'videos'])
  })

  it('should resolve user from Twitch URL', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { resolveTwitchUser } = await import('@shinju-date/twitch-api-client')

    vi.mocked(resolveTwitchUser).mockResolvedValue(mockTwitchUser)

    let callCount = 0
    const mockInsert = vi.fn().mockReturnThis()
    const mockSupabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'twitch_users' && callCount === 0) {
          callCount++
          return {
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            select: vi.fn().mockReturnThis(),
          }
        }
        if (table === 'twitch_users' && callCount === 1) {
          callCount++
          return {
            insert: mockInsert.mockReturnValue({
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id: 'twitch-user-row-123' },
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
    formData.append('twitch_user', 'https://www.twitch.tv/exampleuser')

    const result = await addTwitchUserAction({}, formData)

    expect(result).toEqual({ success: true })
    expect(resolveTwitchUser).toHaveBeenCalledWith({
      kind: 'login',
      login: 'exampleuser',
    })
  })

  it('should return error when talent_id is missing', async () => {
    const formData = new FormData()
    formData.append('twitch_user', 'exampleuser')

    const result = await addTwitchUserAction({}, formData)

    expect(result).toEqual({
      errors: {
        generic: ['タレントIDが指定されていません。'],
      },
    })
  })

  it('should return error when twitch_user is empty', async () => {
    const formData = new FormData()
    formData.append('talent_id', talentId)
    formData.append('twitch_user', '')

    const result = await addTwitchUserAction({}, formData)

    expect(result).toEqual({
      errors: {
        twitch_user: [
          'Twitchのログイン名、ユーザーID、またはURLを入力してください。',
        ],
      },
    })
  })

  it('should return error for invalid input format', async () => {
    const formData = new FormData()
    formData.append('talent_id', talentId)
    formData.append('twitch_user', 'ab')

    const result = await addTwitchUserAction({}, formData)

    expect(result).toEqual({
      errors: {
        twitch_user: [
          '有効なログイン名、ユーザーID（数字）、またはTwitch URLを入力してください。',
        ],
      },
    })
  })

  it('should return error when Twitch user is not found', async () => {
    const { resolveTwitchUser } = await import('@shinju-date/twitch-api-client')

    vi.mocked(resolveTwitchUser).mockResolvedValue(null)

    const formData = new FormData()
    formData.append('talent_id', talentId)
    formData.append('twitch_user', 'missinguser')

    const result = await addTwitchUserAction({}, formData)

    expect(result).toEqual({
      errors: {
        twitch_user: [
          'Twitchでユーザーが見つかりませんでした。入力内容を確認してください。',
        ],
      },
    })
  })

  it('should return error when credentials are missing', async () => {
    const { resolveTwitchUser } = await import('@shinju-date/twitch-api-client')

    vi.mocked(resolveTwitchUser).mockRejectedValue(
      new TypeError(
        'Twitch Client ID and Client Secret are required (TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET).',
      ),
    )

    const formData = new FormData()
    formData.append('talent_id', talentId)
    formData.append('twitch_user', 'exampleuser')

    const result = await addTwitchUserAction({}, formData)

    expect(result).toEqual({
      errors: {
        generic: [
          'Twitch APIの認証情報が設定されていません。管理者に連絡してください。',
        ],
      },
    })
  })

  it('should return error when user already exists for this talent', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { resolveTwitchUser } = await import('@shinju-date/twitch-api-client')

    vi.mocked(resolveTwitchUser).mockResolvedValue(mockTwitchUser)

    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'existing-user', talent_id: talentId },
        error: null,
      }),
      select: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('talent_id', talentId)
    formData.append('twitch_user', 'exampleuser')

    const result = await addTwitchUserAction({}, formData)

    expect(result).toEqual({
      errors: {
        twitch_user: ['このTwitchユーザーは既に登録されています。'],
      },
    })
  })

  it('should return error when user belongs to another talent', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { resolveTwitchUser } = await import('@shinju-date/twitch-api-client')

    vi.mocked(resolveTwitchUser).mockResolvedValue(mockTwitchUser)

    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'existing-user',
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
    formData.append('twitch_user', 'exampleuser')

    const result = await addTwitchUserAction({}, formData)

    expect(result).toEqual({
      errors: {
        twitch_user: [
          'このTwitchユーザーは別のタレントに既に登録されています。',
        ],
      },
    })
  })
})

describe('removeTwitchUserAction', () => {
  it('should successfully remove Twitch user', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')

    let callCount = 0
    const mockSupabaseClient = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'twitch_users' && callCount === 0) {
          callCount++
          return {
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                twitch_login_name: 'exampleuser',
                twitch_user_id: twitchUserId,
              },
              error: null,
            }),
          }
        }
        if (table === 'twitch_users' && callCount === 1) {
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
        data: {
          twitch_login_name: 'exampleuser',
          twitch_user_id: twitchUserId,
        },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await removeTwitchUserAction('twitch-user-row-123', talentId)

    expect(result).toEqual({ success: true })
    expect(createAuditLog).toHaveBeenCalledWith(
      'TWITCH_USER_DELETE',
      'twitch_users',
      'twitch-user-row-123',
      {
        talent_id: talentId,
        twitch_login_name: 'exampleuser',
        twitch_user_id: twitchUserId,
      },
    )
    expect(revalidatePath).toHaveBeenCalledWith(`/talents/${talentId}`)
    expect(revalidatePath).toHaveBeenCalledWith('/talents')
    expect(revalidateTags).toHaveBeenCalledWith(['talents', 'videos'])
  })

  it('should return error when user is not found (PGRST116)', async () => {
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

    const result = await removeTwitchUserAction('twitch-user-row-123', talentId)

    expect(result).toEqual({
      error:
        '指定されたTwitchユーザーが見つかりません。既に削除されているか、存在しないIDが指定されています。',
      success: false,
    })
    expect(logger.warn).toHaveBeenCalled()
  })

  it('should return error when ids are missing', async () => {
    const result1 = await removeTwitchUserAction('', 'talent-id')
    expect(result1).toEqual({
      error: 'TwitchユーザーIDまたはタレントIDが指定されていません。',
      success: false,
    })

    const result2 = await removeTwitchUserAction('user-id', '')
    expect(result2).toEqual({
      error: 'TwitchユーザーIDまたはタレントIDが指定されていません。',
      success: false,
    })
  })
})
