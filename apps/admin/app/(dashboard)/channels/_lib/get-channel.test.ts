import { describe, expect, it, vi } from 'vitest'
import getChannel from './get-channel'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: vi.fn(),
}))

describe('getChannel', () => {
  it('should return null when channel is not found (PGRST116 error)', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')

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

    const result = await getChannel('non-existent-id')

    expect(result).toBeNull()
  })

  it('should throw error for other database errors', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')

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
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    await expect(getChannel('some-id')).rejects.toThrow(
      'Database connection error',
    )
  })

  it('should return null when channel ID has invalid UUID format', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase')

    const mockSupabaseClient = {
      eq: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: '22P02',
          message: 'invalid input syntax for type uuid: "a"',
        },
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabaseClient as never,
    )

    const result = await getChannel('a')

    expect(result).toBeNull()
  })
})
