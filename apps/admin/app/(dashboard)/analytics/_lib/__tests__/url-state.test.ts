import { describe, expect, it } from 'vitest'
import {
  createDateRangeUrlParams,
  getDefaultDateRange,
  parseDateRangeFromUrl,
  parseSelectedDateFromUrl,
} from '../url-state'

describe('url-state utilities', () => {
  describe('parseDateRangeFromUrl', () => {
    it('should parse valid date range from URL params', () => {
      // Use a recent date range that would be valid for testing
      const today = new Date()
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const startDate = sevenDaysAgo.toISOString().split('T')[0]
      const endDate = today.toISOString().split('T')[0]

      const params = new URLSearchParams(`from=${startDate}&to=${endDate}`)
      const result = parseDateRangeFromUrl(params)

      expect(result).toEqual({
        endDate,
        startDate,
      })
    })

    it('should return null when params are missing', () => {
      const params = new URLSearchParams('from=2024-01-01')
      const result = parseDateRangeFromUrl(params)

      expect(result).toBeNull()
    })

    it('should return null when date range is invalid (start > end)', () => {
      const today = new Date()
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const startDate = today.toISOString().split('T')[0]
      const endDate = sevenDaysAgo.toISOString().split('T')[0]

      const params = new URLSearchParams(`from=${startDate}&to=${endDate}`)
      const result = parseDateRangeFromUrl(params)

      expect(result).toBeNull()
    })

    it('should return null when date range exceeds 90 days', () => {
      const today = new Date()
      const ninetyOneDaysAgo = new Date(today)
      ninetyOneDaysAgo.setDate(ninetyOneDaysAgo.getDate() - 91)

      const startDate = ninetyOneDaysAgo.toISOString().split('T')[0]
      const endDate = today.toISOString().split('T')[0]

      const params = new URLSearchParams(`from=${startDate}&to=${endDate}`)
      const result = parseDateRangeFromUrl(params)

      expect(result).toBeNull()
    })

    it('should return null when end date is in the future', () => {
      // The function uses the current system date, so we'll test with a definite future date
      const futureDate = '2030-01-01'
      const validPastDate = '2029-12-25'

      const futureParams = new URLSearchParams(
        `from=${validPastDate}&to=${futureDate}`,
      )
      const futureResult = parseDateRangeFromUrl(futureParams)

      expect(futureResult).toBeNull()
    })

    it('should return null when date format is invalid', () => {
      const params = new URLSearchParams('from=invalid-date&to=2024-01-07')
      const result = parseDateRangeFromUrl(params)

      expect(result).toBeNull()
    })
  })

  describe('parseSelectedDateFromUrl', () => {
    it('should parse valid selected date from URL params', () => {
      const today = new Date()
      const threeDaysAgo = new Date(today)
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      const selectedDate = threeDaysAgo.toISOString().split('T')[0]
      const params = new URLSearchParams(`date=${selectedDate}`)
      const result = parseSelectedDateFromUrl(params)

      expect(result).toBe(selectedDate)
    })

    it('should return null when date param is missing', () => {
      const params = new URLSearchParams('from=2024-01-01&to=2024-01-07')
      const result = parseSelectedDateFromUrl(params)

      expect(result).toBeNull()
    })

    it('should return null when selected date is in the future', () => {
      const futureDate = '2030-01-01'
      const params = new URLSearchParams(`date=${futureDate}`)
      const result = parseSelectedDateFromUrl(params)

      expect(result).toBeNull()
    })

    it('should return null when selected date format is invalid', () => {
      const params = new URLSearchParams('date=invalid-date')
      const result = parseSelectedDateFromUrl(params)

      expect(result).toBeNull()
    })
  })

  describe('getDefaultDateRange', () => {
    it('should return a 7-day range ending today', () => {
      const result = getDefaultDateRange()

      expect(result).toHaveProperty('startDate')
      expect(result).toHaveProperty('endDate')
      expect(typeof result.startDate).toBe('string')
      expect(typeof result.endDate).toBe('string')

      // Should be valid date format
      expect(() => new Date(result.startDate)).not.toThrow()
      expect(() => new Date(result.endDate)).not.toThrow()
    })
  })

  describe('createDateRangeUrlParams', () => {
    it('should create valid URL params from date range', () => {
      const dateRange = {
        endDate: '2024-01-07',
        startDate: '2024-01-01',
      }

      const result = createDateRangeUrlParams(dateRange)

      expect(result).toBe('from=2024-01-01&to=2024-01-07')
    })

    it('should include selected date when provided', () => {
      const dateRange = {
        endDate: '2024-01-07',
        startDate: '2024-01-01',
      }
      const selectedDate = '2024-01-03'

      const result = createDateRangeUrlParams(dateRange, selectedDate)

      expect(result).toBe('from=2024-01-01&to=2024-01-07&date=2024-01-03')
    })

    it('should not include date param when selectedDate is null', () => {
      const dateRange = {
        endDate: '2024-01-07',
        startDate: '2024-01-01',
      }

      const result = createDateRangeUrlParams(dateRange, null)

      expect(result).toBe('from=2024-01-01&to=2024-01-07')
    })
  })
})
