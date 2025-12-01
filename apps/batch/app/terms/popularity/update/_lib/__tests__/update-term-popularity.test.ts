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
    const selectMock = vi.fn().mockResolvedValue({
      data: [
        { term: 'タレント名1' },
        { term: 'タレント名2' },
        { term: '配信' },
      ],
      error: null,
    })

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 'mock-id' }],
          error: null,
        }),
      }),
    })

    const mockSupabase = {
      from: vi.fn().mockImplementation((table) => {
        if (table === 'terms') {
          return {
            select: selectMock,
            update: updateMock,
          }
        }
        return {}
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
    expect(selectMock).toHaveBeenCalled()
    expect(updateMock).toHaveBeenCalledTimes(3)
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
      zrange: vi
        .fn()
        .mockResolvedValue(['unknown-term', 10, 'another-term', 5]),
    }

    // Setup mock Supabase client returning no matching terms
    const selectMock = vi.fn().mockResolvedValue({
      data: [], // No existing terms
      error: null,
    })

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: selectMock,
      }),
    }

    // Execute
    const result = await updateTermPopularity(
      mockRedis as any,
      mockSupabase as any,
    )

    // Verify
    expect(result.total).toBe(2)
    expect(result.updated).toBe(0)
    expect(result.notFound).toBe(2)
  })

  it('should handle database errors gracefully', async () => {
    // Setup mock Redis client
    const mockRedis = {
      zrange: vi.fn().mockResolvedValue(['term1', 10]),
    }

    // Setup mock Supabase client with error on select
    const selectMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: selectMock,
      }),
    }

    // Execute - should throw error
    await expect(
      updateTermPopularity(mockRedis as any, mockSupabase as any),
    ).rejects.toThrow()
  })

  it('should convert scores to integers', async () => {
    // Setup mock Redis client with decimal scores
    const mockRedis = {
      zrange: vi.fn().mockResolvedValue(['term1', 10.7, 'term2', 5.3]),
    }

    const selectMock = vi.fn().mockResolvedValue({
      data: [{ term: 'term1' }, { term: 'term2' }],
      error: null,
    })

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
        select: selectMock,
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
