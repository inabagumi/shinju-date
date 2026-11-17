import { describe, expect, it } from 'vitest'
import { resolvePeriod } from './resolve-period'

describe('resolvePeriod', () => {
  it('returns the whole date range when no date is selected', () => {
    const period = resolvePeriod({
      dateRange: { endDate: '2026-11-14', startDate: '2026-11-08' },
      selectedDate: null,
    })

    expect(period.start).toBe('2026-11-08')
    expect(period.end).toBe('2026-11-14')
  })

  it('returns the selected date as both ends of the period', () => {
    const period = resolvePeriod({
      dateRange: { endDate: '2026-11-14', startDate: '2026-11-08' },
      selectedDate: '2026-11-10',
    })

    expect(period.start).toBe('2026-11-10')
    expect(period.end).toBe('2026-11-10')
  })
})
