import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  activateTalentAction,
  createTalentAction,
  deleteTalentAction,
  restoreTalentAction,
  retireTalentAction,
  updateTalentAction,
} from '../index'

// Mock dependencies
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

vi.mock('@shinju-date/youtube-api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shinju-date/youtube-api-client')>()),
  resolveYouTubeChannel: vi.fn(),
}))

vi.spyOn(Temporal.Now, 'instant').mockReturnValue(
  Temporal.Instant.from('2024-11-24T17:00:00Z'),
)

// アイコンの同期は service role を使うため、ここではモックして呼び出し内容だけを確認する
vi.mock('@/lib/youtube-channel-icon', () => ({
  hasProfileImageChanged: (result: string | null) =>
    result !== null && result !== 'unchanged',
  syncYouTubeChannelIconSafely: vi.fn().mockResolvedValue('unchanged'),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('updateTalentAction', () => {
  it('should successfully update talent', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')

    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { name: 'Updated Talent' },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('id', '123e4567-e89b-12d3-a456-426614174000')
    formData.append('name', 'Updated Talent')
    formData.append('theme_color', '#FF5733')

    const result = await updateTalentAction({}, formData)

    expect(result).toEqual({})
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      name: 'Updated Talent',
      theme_color: '#FF5733',
      updated_at: '2024-11-24T17:00:00Z',
    })
    expect(createAuditLog).toHaveBeenCalledWith(
      'CHANNEL_UPDATE',
      'channels',
      '123e4567-e89b-12d3-a456-426614174000',
      { entityName: 'Updated Talent' },
    )
    expect(revalidatePath).toHaveBeenCalledWith('/talents')
    expect(revalidateTags).toHaveBeenCalledWith(['talents', 'videos'])
  })

  it('should return error when talent is not found (PGRST116)', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { logger } = await import('@shinju-date/logger')

    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'The result contains 0 rows',
        },
      }),
      update: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('id', '123e4567-e89b-12d3-a456-426614174000')
    formData.append('name', 'Updated Talent')

    const result = await updateTalentAction({}, formData)

    expect(result).toEqual({
      errors: {
        generic: [
          '指定されたタレントが見つかりません。既に削除されているか、存在しないIDが指定されています。',
        ],
      },
    })
    expect(logger.warn).toHaveBeenCalledWith(
      '更新対象のタレントが見つかりませんでした',
      { id: '123e4567-e89b-12d3-a456-426614174000' },
    )
  })

  it('should return validation error for invalid UUID', async () => {
    const formData = new FormData()
    formData.append('id', 'invalid-uuid')
    formData.append('name', 'Updated Talent')

    const result = await updateTalentAction({}, formData)

    expect(result.errors?.['id']).toBeDefined()
  })

  it('should return validation error for empty name', async () => {
    const formData = new FormData()
    formData.append('id', '123e4567-e89b-12d3-a456-426614174000')
    formData.append('name', '')

    const result = await updateTalentAction({}, formData)

    expect(result.errors?.['name']).toBeDefined()
  })

  it('should return validation error for invalid color format', async () => {
    const formData = new FormData()
    formData.append('id', '123e4567-e89b-12d3-a456-426614174000')
    formData.append('name', 'Updated Talent')
    formData.append('theme_color', 'invalid-color')

    const result = await updateTalentAction({}, formData)

    expect(result.errors?.['theme_color']).toBeDefined()
  })

  it('should handle null theme_color', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')

    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { name: 'Updated Talent' },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('id', '123e4567-e89b-12d3-a456-426614174000')
    formData.append('name', 'Updated Talent')
    // Don't append theme_color at all to test null handling

    const result = await updateTalentAction({}, formData)

    expect(result).toEqual({})
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      name: 'Updated Talent',
      theme_color: null,
      updated_at: '2024-11-24T17:00:00Z',
    })
  })

  it('should handle database errors other than PGRST116', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { logger } = await import('@shinju-date/logger')

    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST500',
          message: 'Database connection error',
        },
      }),
      update: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('id', '123e4567-e89b-12d3-a456-426614174000')
    formData.append('name', 'Updated Talent')

    const result = await updateTalentAction({}, formData)

    expect(result.errors?.['generic']).toBeDefined()
    expect(logger.error).toHaveBeenCalled()
  })
})

const TALENT_ID = '123e4567-e89b-12d3-a456-426614174000'
const NOW = '2024-11-24T17:00:00Z'

const NOT_FOUND_RESULT = {
  data: null,
  error: {
    code: 'PGRST116',
    message: 'The result contains 0 rows',
  },
}

const DATABASE_ERROR_RESULT = {
  data: null,
  error: {
    code: 'PGRST500',
    message: 'Database connection error',
  },
}

async function mockLifecycleSupabaseClient(singleResult: unknown) {
  const { createSupabaseServerClient } = await import('@/lib/supabase')

  const mockSupabaseClient = {
    eq: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(singleResult),
    update: vi.fn().mockReturnThis(),
  }

  vi.mocked(createSupabaseServerClient).mockResolvedValue(
    mockSupabaseClient as never,
  )

  return mockSupabaseClient
}

interface LifecycleActionCase {
  name: string
  action: (id: string) => Promise<{ success: boolean; error?: string }>
  auditAction: string
  expectedUpdate: Record<string, unknown>
  /** 遷移前の status 条件（null は status で絞り込まない） */
  expectedStatusFilter: 'active' | 'retired' | null
  /** 遷移前の deleted_at 条件 */
  expectedDeletedAtFilter: 'is null' | 'is not null'
  notFoundWarning: string
  notFoundError: string
  failureLog: string
  failureError: string
}

const lifecycleActionCases: LifecycleActionCase[] = [
  {
    action: deleteTalentAction,
    auditAction: 'CHANNEL_DELETE',
    expectedDeletedAtFilter: 'is null',
    expectedStatusFilter: null,
    expectedUpdate: { deleted_at: NOW, updated_at: NOW },
    failureError: 'タレントの削除に失敗しました。',
    failureLog: 'タレントの削除に失敗しました',
    name: 'deleteTalentAction',
    notFoundError:
      '指定されたタレントが見つかりません。既に削除されているか、存在しないIDが指定されています。',
    notFoundWarning: '削除対象のタレントが見つかりませんでした',
  },
  {
    action: restoreTalentAction,
    auditAction: 'CHANNEL_RESTORE',
    expectedDeletedAtFilter: 'is not null',
    expectedStatusFilter: null,
    expectedUpdate: { deleted_at: null, updated_at: NOW },
    failureError: 'タレントの復活に失敗しました。',
    failureLog: 'タレントの復活に失敗しました',
    name: 'restoreTalentAction',
    notFoundError:
      '指定されたタレントが見つかりません。既に復活しているか、存在しないIDが指定されています。',
    notFoundWarning: '復活対象のタレントが見つかりませんでした',
  },
  {
    action: retireTalentAction,
    auditAction: 'CHANNEL_RETIRE',
    expectedDeletedAtFilter: 'is null',
    expectedStatusFilter: 'active',
    expectedUpdate: { status: 'retired', updated_at: NOW },
    failureError: 'タレントの引退に失敗しました。',
    failureLog: 'タレントの引退に失敗しました',
    name: 'retireTalentAction',
    notFoundError:
      '指定されたタレントが見つかりません。既に引退・削除されているか、存在しないIDが指定されています。',
    notFoundWarning: '引退対象のタレントが見つかりませんでした',
  },
  {
    action: activateTalentAction,
    auditAction: 'CHANNEL_ACTIVATE',
    expectedDeletedAtFilter: 'is null',
    expectedStatusFilter: 'retired',
    expectedUpdate: { status: 'active', updated_at: NOW },
    failureError: 'タレントのアクティブ化に失敗しました。',
    failureLog: 'タレントのアクティブ化に失敗しました',
    name: 'activateTalentAction',
    notFoundError:
      '指定されたタレントが見つかりません。既にアクティブ・削除されているか、存在しないIDが指定されています。',
    notFoundWarning: 'アクティブ化対象のタレントが見つかりませんでした',
  },
]

describe.each(lifecycleActionCases)('$name', (testCase) => {
  it('should update the talent and record an audit log', async () => {
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')

    const mockSupabaseClient = await mockLifecycleSupabaseClient({
      data: { name: 'Test Talent' },
      error: null,
    })

    const result = await testCase.action(TALENT_ID)

    expect(result).toEqual({ success: true })
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('talents')
    expect(mockSupabaseClient.update).toHaveBeenCalledWith(
      testCase.expectedUpdate,
    )
    expect(mockSupabaseClient.select).toHaveBeenCalledWith('name')
    expect(createAuditLog).toHaveBeenCalledWith(
      testCase.auditAction,
      'channels',
      TALENT_ID,
      { entityName: 'Test Talent' },
    )
    expect(revalidatePath).toHaveBeenCalledWith('/talents')
    expect(revalidatePath).toHaveBeenCalledWith(`/talents/${TALENT_ID}`)
    expect(revalidateTags).toHaveBeenCalledWith(['talents', 'videos'])
  })

  it('should only target talents in the expected source state', async () => {
    const mockSupabaseClient = await mockLifecycleSupabaseClient({
      data: { name: 'Test Talent' },
      error: null,
    })

    await testCase.action(TALENT_ID)

    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', TALENT_ID)

    if (testCase.expectedStatusFilter) {
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
        'status',
        testCase.expectedStatusFilter,
      )
      expect(mockSupabaseClient.eq).toHaveBeenCalledTimes(2)
    } else {
      expect(mockSupabaseClient.eq).toHaveBeenCalledTimes(1)
    }

    if (testCase.expectedDeletedAtFilter === 'is null') {
      expect(mockSupabaseClient.is).toHaveBeenCalledWith('deleted_at', null)
      expect(mockSupabaseClient.not).not.toHaveBeenCalled()
    } else {
      expect(mockSupabaseClient.not).toHaveBeenCalledWith(
        'deleted_at',
        'is',
        null,
      )
      expect(mockSupabaseClient.is).not.toHaveBeenCalled()
    }
  })

  it('should return error when talent is not found (PGRST116)', async () => {
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidateTags } = await import('@shinju-date/web-cache')
    const { logger } = await import('@shinju-date/logger')

    await mockLifecycleSupabaseClient(NOT_FOUND_RESULT)

    const result = await testCase.action(TALENT_ID)

    expect(result).toEqual({
      error: testCase.notFoundError,
      success: false,
    })
    expect(logger.warn).toHaveBeenCalledWith(testCase.notFoundWarning, {
      id: TALENT_ID,
    })
    expect(logger.error).not.toHaveBeenCalled()
    expect(createAuditLog).not.toHaveBeenCalled()
    expect(revalidateTags).not.toHaveBeenCalled()
  })

  it('should return error when ID is not provided', async () => {
    const { createAuditLog } = await import('@/lib/audit-log')

    const mockSupabaseClient = await mockLifecycleSupabaseClient({
      data: { name: 'Test Talent' },
      error: null,
    })

    const result = await testCase.action('')

    expect(result).toEqual({
      error: 'IDが指定されていません。',
      success: false,
    })
    expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    expect(createAuditLog).not.toHaveBeenCalled()
  })

  it('should handle database errors other than PGRST116', async () => {
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidateTags } = await import('@shinju-date/web-cache')
    const { logger } = await import('@shinju-date/logger')

    await mockLifecycleSupabaseClient(DATABASE_ERROR_RESULT)

    const result = await testCase.action(TALENT_ID)

    expect(result).toEqual({
      error: testCase.failureError,
      success: false,
    })
    expect(logger.error).toHaveBeenCalledWith(testCase.failureLog, {
      error: DATABASE_ERROR_RESULT.error,
      id: TALENT_ID,
    })
    expect(createAuditLog).not.toHaveBeenCalled()
    expect(revalidateTags).not.toHaveBeenCalled()
  })
})

describe('createTalentAction', () => {
  it('should successfully create talent', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')

    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'New Talent',
        },
        error: null,
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('name', 'New Talent')

    const result = await createTalentAction({}, formData)

    expect(result).toEqual({})
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
      name: 'New Talent',
    })
    expect(createAuditLog).toHaveBeenCalledWith(
      'CHANNEL_CREATE',
      'channels',
      '123e4567-e89b-12d3-a456-426614174000',
      { entityName: 'New Talent' },
    )
    expect(revalidatePath).toHaveBeenCalledWith('/talents')
    expect(revalidateTags).toHaveBeenCalledWith(['talents', 'videos'])
  })

  it('should add the YouTube channel with its icon', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { resolveYouTubeChannel } = await import(
      '@shinju-date/youtube-api-client'
    )
    const { syncYouTubeChannelIconSafely } = await import(
      '@/lib/youtube-channel-icon'
    )

    const youtubeChannel = {
      contentDetails: {
        relatedPlaylists: { uploads: 'UUabcdefghijklmnopqrstuv' },
      },
      id: 'UCabcdefghijklmnopqrstuv',
      snippet: { customUrl: '@example', title: 'Example Channel' },
    }

    vi.mocked(resolveYouTubeChannel).mockResolvedValue(youtubeChannel as never)

    const channelInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'channel-row-1' },
        error: null,
      }),
    })
    const mockSupabaseClient = {
      from: vi.fn((table: string) =>
        table === 'youtube_channels'
          ? { insert: channelInsert }
          : {
              insert: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: {
                  id: '123e4567-e89b-12d3-a456-426614174000',
                  name: 'New Talent',
                },
                error: null,
              }),
            },
      ),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('name', 'New Talent')
    formData.append('youtube_channel_id', youtubeChannel.id)

    const result = await createTalentAction({}, formData)

    expect(result).toEqual({})
    expect(channelInsert).toHaveBeenCalledWith({
      name: 'Example Channel',
      talent_id: '123e4567-e89b-12d3-a456-426614174000',
      youtube_channel_id: youtubeChannel.id,
      youtube_handle: '@example',
    })
    expect(syncYouTubeChannelIconSafely).toHaveBeenCalledWith(youtubeChannel, {
      id: 'channel-row-1',
      profile_images: null,
      youtube_channel_id: youtubeChannel.id,
    })
  })

  it('should return error when name is empty', async () => {
    const formData = new FormData()
    formData.append('name', '')

    const result = await createTalentAction({}, formData)

    expect(result).toEqual({
      errors: {
        name: ['タレント名を入力してください。'],
      },
    })
  })

  it('should handle database errors', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { logger } = await import('@shinju-date/logger')

    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST500',
          message: 'Database connection error',
        },
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const formData = new FormData()
    formData.append('name', 'New Talent')

    const result = await createTalentAction({}, formData)

    expect(result.errors?.['generic']).toBeDefined()
    expect(logger.error).toHaveBeenCalled()
  })
})
