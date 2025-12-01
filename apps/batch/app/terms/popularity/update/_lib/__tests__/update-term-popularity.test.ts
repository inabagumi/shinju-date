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

    // Setup mock Supabase client with full term data
    const selectMock = vi.fn().mockResolvedValue({
      data: [
        {
          created_at: '2024-01-01',
          id: 'id1',
          popularity: 0,
          readings: ['たれんとめい1'],
          synonyms: [],
          term: 'タレント名1',
          updated_at: '2024-01-01',
        },
        {
          created_at: '2024-01-01',
          id: 'id2',
          popularity: 0,
          readings: ['たれんとめい2'],
          synonyms: [],
          term: 'タレント名2',
          updated_at: '2024-01-01',
        },
        {
          created_at: '2024-01-01',
          id: 'id3',
          popularity: 0,
          readings: ['はいしん'],
          synonyms: [],
          term: '配信',
          updated_at: '2024-01-01',
        },
      ],
      error: null,
    })

    const upsertMock = vi.fn().mockResolvedValue({
      count: 3,
      error: null,
    })

    const mockSupabase = {
      from: vi.fn().mockImplementation((table) => {
        if (table === 'terms') {
          return {
            select: selectMock,
            upsert: upsertMock,
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
    expect(selectMock).toHaveBeenCalledWith('*')

    // Verify upsert was called with merged data
    expect(upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          popularity: 10,
          readings: ['たれんとめい1'],
          term: 'タレント名1',
        }),
        expect.objectContaining({
          popularity: 5,
          readings: ['たれんとめい2'],
          term: 'タレント名2',
        }),
        expect.objectContaining({
          popularity: 3,
          readings: ['はいしん'],
          term: '配信',
        }),
      ]),
      {
        count: 'exact',
        onConflict: 'term',
      },
    )
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
      data: [
        {
          created_at: '2024-01-01',
          id: 'id1',
          popularity: 0,
          readings: ['reading1'],
          synonyms: [],
          term: 'term1',
          updated_at: '2024-01-01',
        },
        {
          created_at: '2024-01-01',
          id: 'id2',
          popularity: 0,
          readings: ['reading2'],
          synonyms: [],
          term: 'term2',
          updated_at: '2024-01-01',
        },
      ],
      error: null,
    })

    const upsertMock = vi.fn().mockResolvedValue({
      count: 2,
      error: null,
    })

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: selectMock,
        upsert: upsertMock,
      }),
    }

    // Execute
    await updateTermPopularity(mockRedis as any, mockSupabase as any)

    // Verify that scores are floored to integers
    expect(upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ popularity: 10, term: 'term1' }),
        expect.objectContaining({ popularity: 5, term: 'term2' }),
      ]),
      {
        count: 'exact',
        onConflict: 'term',
      },
    )
  })
})
