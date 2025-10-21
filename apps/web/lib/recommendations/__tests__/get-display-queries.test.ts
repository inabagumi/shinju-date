import { range } from '@shinju-date/helpers'
import { describe, expect, it, vi } from 'vitest'
import * as getCombinedQueriesModule from '../get-combined-queries'
import { getDisplayRecommendationQueries } from '../get-display-queries'

// Mock the getCombinedRecommendationQueries function
vi.mock('../get-combined-queries', () => ({
  getCombinedRecommendationQueries: vi.fn(),
}))

describe('getDisplayRecommendationQueries', () => {
  it('should return empty array when no queries are available', async () => {
    vi.mocked(
      getCombinedQueriesModule.getCombinedRecommendationQueries,
    ).mockResolvedValue([])

    const result = await getDisplayRecommendationQueries()

    expect(result).toEqual([])
  })

  it('should return all queries when there are 4 or fewer', async () => {
    const mockQueries = ['query1', 'query2', 'query3']
    vi.mocked(
      getCombinedQueriesModule.getCombinedRecommendationQueries,
    ).mockResolvedValue(mockQueries)

    const result = await getDisplayRecommendationQueries()

    expect(result).toEqual(mockQueries)
  })

  it('should return exactly 4 queries when there are 4 available', async () => {
    const mockQueries = ['query1', 'query2', 'query3', 'query4']
    vi.mocked(
      getCombinedQueriesModule.getCombinedRecommendationQueries,
    ).mockResolvedValue(mockQueries)

    const result = await getDisplayRecommendationQueries()

    expect(result).toEqual(mockQueries)
    expect(result).toHaveLength(4)
  })

  it('should include top 2 champion queries when there are many queries', async () => {
    const mockQueries = range(1, 26).map((i) => `query${i}`)
    vi.mocked(
      getCombinedQueriesModule.getCombinedRecommendationQueries,
    ).mockResolvedValue(mockQueries)

    const result = await getDisplayRecommendationQueries()

    // Top 2 should always be included
    expect(result[0]).toBe('query1')
    expect(result[1]).toBe('query2')
    expect(result).toHaveLength(4)
  })

  it('should select random queries from positions 3-20', async () => {
    const mockQueries = range(1, 26).map((i) => `query${i}`)
    vi.mocked(
      getCombinedQueriesModule.getCombinedRecommendationQueries,
    ).mockResolvedValue(mockQueries)

    const result = await getDisplayRecommendationQueries()

    // First two should be champions
    expect(result[0]).toBe('query1')
    expect(result[1]).toBe('query2')

    // Last two should be from positions 3-20 (query3 to query20)
    const randomQueries = result.slice(2)
    for (const query of randomQueries) {
      const queryNum = Number.parseInt(query.replace('query', ''), 10)
      expect(queryNum).toBeGreaterThanOrEqual(3)
      expect(queryNum).toBeLessThanOrEqual(20)
    }

    expect(result).toHaveLength(4)
  })

  it('should not include queries beyond position 20 in random selection', async () => {
    const mockQueries = range(1, 31).map((i) => `query${i}`)
    vi.mocked(
      getCombinedQueriesModule.getCombinedRecommendationQueries,
    ).mockResolvedValue(mockQueries)

    // Run multiple times to check randomness doesn't pick beyond position 20
    const results = await Promise.all(
      range(10).map(() => getDisplayRecommendationQueries()),
    )

    for (const result of results) {
      expect(result[0]).toBe('query1')
      expect(result[1]).toBe('query2')

      const randomQueries = result.slice(2)
      for (const query of randomQueries) {
        const queryNum = Number.parseInt(query.replace('query', ''), 10)
        expect(queryNum).toBeGreaterThanOrEqual(3)
        expect(queryNum).toBeLessThanOrEqual(20)
      }
    }
  })

  it('should provide different results on multiple calls (randomness)', async () => {
    const mockQueries = range(1, 26).map((i) => `query${i}`)
    vi.mocked(
      getCombinedQueriesModule.getCombinedRecommendationQueries,
    ).mockResolvedValue(mockQueries)

    // Get multiple results
    const results = await Promise.all(
      range(5).map(() => getDisplayRecommendationQueries()),
    )

    // Check that champions are always the same
    for (const result of results) {
      expect(result[0]).toBe('query1')
      expect(result[1]).toBe('query2')
    }

    // Check that random parts vary (at least one should be different)
    const randomParts = results.map((r) => r.slice(2).join(','))
    const uniqueRandomParts = new Set(randomParts)

    // With 5 calls and 18 possible queries (3-20), we should get some variety
    // This might occasionally fail due to randomness, but very unlikely
    expect(uniqueRandomParts.size).toBeGreaterThan(1)
  })

  it('should handle case with exactly 5 queries', async () => {
    const mockQueries = ['query1', 'query2', 'query3', 'query4', 'query5']
    vi.mocked(
      getCombinedQueriesModule.getCombinedRecommendationQueries,
    ).mockResolvedValue(mockQueries)

    const result = await getDisplayRecommendationQueries()

    expect(result).toHaveLength(4)
    expect(result[0]).toBe('query1')
    expect(result[1]).toBe('query2')
    // Last 2 should be from query3, query4, or query5
    const randomQueries = result.slice(2)
    for (const query of randomQueries) {
      expect(['query3', 'query4', 'query5']).toContain(query)
    }
  })

  it('should not contain duplicate queries', async () => {
    const mockQueries = range(1, 26).map((i) => `query${i}`)
    vi.mocked(
      getCombinedQueriesModule.getCombinedRecommendationQueries,
    ).mockResolvedValue(mockQueries)

    // Run multiple times to ensure no duplicates in any result
    const results = await Promise.all(
      range(10).map(() => getDisplayRecommendationQueries()),
    )

    for (const result of results) {
      const uniqueQueries = new Set(result)
      expect(uniqueQueries.size).toBe(result.length)
    }
  })
})
