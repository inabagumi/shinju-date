import { describe, expect, it, vi } from 'vitest'
import {
  createTalentAction,
  deleteTalentAction,
  updateTalentAction,
} from '../index'

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

describe('updateTalentAction', () => {
  it('should successfully update talent', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')

    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
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

    expect(result.errors?.id).toBeDefined()
  })

  it('should return validation error for empty name', async () => {
    const formData = new FormData()
    formData.append('id', '123e4567-e89b-12d3-a456-426614174000')
    formData.append('name', '')

    const result = await updateTalentAction({}, formData)

    expect(result.errors?.name).toBeDefined()
  })

  it('should return validation error for invalid color format', async () => {
    const formData = new FormData()
    formData.append('id', '123e4567-e89b-12d3-a456-426614174000')
    formData.append('name', 'Updated Talent')
    formData.append('theme_color', 'invalid-color')

    const result = await updateTalentAction({}, formData)

    expect(result.errors?.theme_color).toBeDefined()
  })

  it('should handle null theme_color', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')

    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
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

    expect(result.errors?.generic).toBeDefined()
    expect(logger.error).toHaveBeenCalled()
  })
})

describe('deleteTalentAction', () => {
  it('should successfully delete (soft delete) talent', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')
    const { createAuditLog } = await import('@/lib/audit-log')
    const { revalidatePath } = await import('next/cache')
    const { revalidateTags } = await import('@shinju-date/web-cache')

    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { name: 'Deleted Talent' },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await deleteTalentAction('123e4567-e89b-12d3-a456-426614174000')

    expect(result).toEqual({ success: true })
    expect(mockSupabaseClient.update).toHaveBeenCalledWith({
      deleted_at: '2024-11-24T17:00:00Z',
      updated_at: '2024-11-24T17:00:00Z',
    })
    expect(createAuditLog).toHaveBeenCalledWith(
      'CHANNEL_DELETE',
      'channels',
      '123e4567-e89b-12d3-a456-426614174000',
      { entityName: 'Deleted Talent' },
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

    const result = await deleteTalentAction('123e4567-e89b-12d3-a456-426614174000')

    expect(result).toEqual({
      error:
        '指定されたタレントが見つかりません。既に削除されているか、存在しないIDが指定されています。',
      success: false,
    })
    expect(logger.warn).toHaveBeenCalledWith(
      '削除対象のタレントが見つかりませんでした',
      { id: '123e4567-e89b-12d3-a456-426614174000' },
    )
  })

  it('should return error when ID is not provided', async () => {
    const result = await deleteTalentAction('')

    expect(result).toEqual({
      error: 'IDが指定されていません。',
      success: false,
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

    const result = await deleteTalentAction('123e4567-e89b-12d3-a456-426614174000')

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(logger.error).toHaveBeenCalled()
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
        data: { id: '123e4567-e89b-12d3-a456-426614174000', name: 'New Talent' },
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

    expect(result.errors?.generic).toBeDefined()
    expect(logger.error).toHaveBeenCalled()
  })
})
