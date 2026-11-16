import { describe, expect, it } from 'vitest'
import { updateDateRangeParams } from './analytics-url-params'

describe('updateDateRangeParams', () => {
  const dateRange = { endDate: '2025-11-07', startDate: '2025-11-01' }

  it('sets from and to when there are no parameters', () => {
    expect(updateDateRangeParams(new URLSearchParams(), dateRange)).toBe(
      'from=2025-11-01&to=2025-11-07',
    )
  })

  it('replaces the current from and to', () => {
    expect(
      updateDateRangeParams(
        new URLSearchParams({ from: '2025-10-01', to: '2025-10-30' }),
        dateRange,
      ),
    ).toBe('from=2025-11-01&to=2025-11-07')
  })

  it('keeps the selected tab', () => {
    expect(
      updateDateRangeParams(new URLSearchParams({ tab: 'talents' }), dateRange),
    ).toBe('tab=talents&from=2025-11-01&to=2025-11-07')
  })

  it('keeps the selected date when it is within the new range', () => {
    for (const date of ['2025-11-01', '2025-11-03', '2025-11-07']) {
      expect(
        updateDateRangeParams(
          new URLSearchParams({ date, tab: 'talents' }),
          dateRange,
        ),
      ).toBe(`date=${date}&tab=talents&from=2025-11-01&to=2025-11-07`)
    }
  })

  it('removes the selected date when it is outside the new range', () => {
    for (const date of ['2025-10-31', '2025-11-08']) {
      expect(
        updateDateRangeParams(
          new URLSearchParams({ date, tab: 'talents' }),
          dateRange,
        ),
      ).toBe('tab=talents&from=2025-11-01&to=2025-11-07')
    }
  })

  it('removes a selected date that is not a valid date', () => {
    expect(
      updateDateRangeParams(
        new URLSearchParams({ date: 'invalid' }),
        dateRange,
      ),
    ).toBe('from=2025-11-01&to=2025-11-07')
  })
})
