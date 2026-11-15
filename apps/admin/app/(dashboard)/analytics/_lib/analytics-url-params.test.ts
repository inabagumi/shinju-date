import { describe, expect, it } from 'vitest'
import { createAnalyticsUrlParams } from './analytics-url-params'

describe('createAnalyticsUrlParams', () => {
  const dateRange = { endDate: '2025-11-07', startDate: '2025-11-01' }

  it('sets from and to when no date is selected', () => {
    expect(createAnalyticsUrlParams(dateRange)).toBe(
      'from=2025-11-01&to=2025-11-07',
    )
  })

  it('sets only date when a date is selected', () => {
    expect(createAnalyticsUrlParams(dateRange, '2025-11-03')).toBe(
      'date=2025-11-03',
    )
  })

  it('ignores null and empty selected dates', () => {
    expect(createAnalyticsUrlParams(dateRange, null)).toBe(
      'from=2025-11-01&to=2025-11-07',
    )
    expect(createAnalyticsUrlParams(dateRange, '')).toBe(
      'from=2025-11-01&to=2025-11-07',
    )
  })

  it('appends tab after the date range', () => {
    expect(createAnalyticsUrlParams(dateRange, null, 'talents')).toBe(
      'from=2025-11-01&to=2025-11-07&tab=talents',
    )
  })

  it('appends tab after the selected date', () => {
    expect(createAnalyticsUrlParams(dateRange, '2025-11-03', 'videos')).toBe(
      'date=2025-11-03&tab=videos',
    )
  })

  it('ignores null and empty tabs', () => {
    expect(createAnalyticsUrlParams(dateRange, null, null)).toBe(
      'from=2025-11-01&to=2025-11-07',
    )
    expect(createAnalyticsUrlParams(dateRange, null, '')).toBe(
      'from=2025-11-01&to=2025-11-07',
    )
  })
})
