import { describe, expect, it } from 'vitest'
import { type AnalyticsSummary, withTrends } from '../index.js'

const current: AnalyticsSummary = {
  recentClicks: 10,
  recentSearches: 20,
  totalPopularKeywords: 30,
}

describe('withTrends', () => {
  it('pairs each value with its changes', () => {
    const yesterday = {
      recentClicks: 4,
      recentSearches: 25,
      totalPopularKeywords: 30,
    }
    const lastWeek = {
      recentClicks: 0,
      recentSearches: 10,
      totalPopularKeywords: 20,
    }

    expect(withTrends(current, yesterday, lastWeek)).toEqual({
      recentClicks: { current: 10, dayChange: 6, weekChange: 10 },
      recentSearches: { current: 20, dayChange: -5, weekChange: 10 },
      totalPopularKeywords: { current: 30, dayChange: 0, weekChange: 10 },
    })
  })

  it('leaves the changes from a missing snapshot null', () => {
    const lastWeek = {
      recentClicks: 5,
      recentSearches: 5,
      totalPopularKeywords: 5,
    }

    expect(withTrends(current, null, lastWeek)).toEqual({
      recentClicks: { current: 10, dayChange: null, weekChange: 5 },
      recentSearches: { current: 20, dayChange: null, weekChange: 15 },
      totalPopularKeywords: { current: 30, dayChange: null, weekChange: 25 },
    })
    expect(withTrends(current, lastWeek, null).recentClicks).toEqual({
      current: 10,
      dayChange: 5,
      weekChange: null,
    })
  })
})
