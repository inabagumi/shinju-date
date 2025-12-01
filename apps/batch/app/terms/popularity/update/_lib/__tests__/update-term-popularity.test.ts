import { REDIS_KEYS } from '@shinju-date/constants'
import { describe, expect, it, vi } from 'vitest'
import { updateTermPopularity } from '../update-term-popularity'

// Mock logger
vi.mock('@shinju-date/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('updateTermPopularity', () => {
  it('should fetch and update term popularity', async () => {
    // Setup mock Redis client
    const mockRedis = {
      zrange: vi
        .fn()
        .mockResolvedValue(['タレント名1', 10, 'タレント名2', 5, '配信', 3]),
    }

    // Setup mock Supabase client
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: 'mock-id' }],
              error: null,
            }),
          }),
        }),
      }),
    }

    // Execute
    const result = await updateTermPopularity(
      mockRedis as any,
      mockSupabase as any,
    )

    // Verify Redis call
    expect(mockRedis.zrange).toHaveBeenCalledWith(
      REDIS_KEYS.SEARCH_POPULAR_ALL_TIME,
      0,
      -1,
      {
        withScores: true,
      },
    )

    // Verify result
    expect(result.total).toBe(3)
    expect(result.updated).toBe(3)
    expect(result.notFound).toBe(0)

    // Verify database calls
    expect(mockSupabase.from).toHaveBeenCalledWith('terms')
  })

  it('should handle empty Redis data', async () => {
    // Setup mock Redis client with no data
    const mockRedis = {
      zrange: vi.fn().mockResolvedValue([]),
    }

    const mockSupabase = {
      from: vi.fn(),
    }

    // Execute
    const result = await updateTermPopularity(
      mockRedis as any,
      mockSupabase as any,
    )

    // Verify
    expect(result.total).toBe(0)
    expect(result.updated).toBe(0)
    expect(result.notFound).toBe(0)
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('should handle terms not found in database', async () => {
    // Setup mock Redis client
    const mockRedis = {
      zrange: vi.fn().mockResolvedValue(['unknown-term', 10]),
    }

    // Setup mock Supabase client returning empty data (term not found)
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    }

    // Execute
    const result = await updateTermPopularity(
      mockRedis as any,
      mockSupabase as any,
    )

    // Verify
    expect(result.total).toBe(1)
    expect(result.updated).toBe(0)
    expect(result.notFound).toBe(1)
  })

  it('should handle database errors gracefully', async () => {
    // Setup mock Redis client
    const mockRedis = {
      zrange: vi.fn().mockResolvedValue(['term1', 10]),
    }

    // Setup mock Supabase client with error
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      }),
    }

    // Execute
    const result = await updateTermPopularity(
      mockRedis as any,
      mockSupabase as any,
    )

    // Verify - should continue despite error
    expect(result.total).toBe(1)
    expect(result.updated).toBe(0)
  })

  it('should convert scores to integers', async () => {
    // Setup mock Redis client with decimal scores
    const mockRedis = {
      zrange: vi.fn().mockResolvedValue(['term1', 10.7, 'term2', 5.3]),
    }

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'mock-id' }],
          error: null,
        }),
      }),
    })

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: updateMock,
      }),
    }

    // Execute
    await updateTermPopularity(mockRedis as any, mockSupabase as any)

    // Verify that scores are floored to integers
    expect(updateMock).toHaveBeenCalledWith({ popularity: 10 })
    expect(updateMock).toHaveBeenCalledWith({ popularity: 5 })
  })
})
