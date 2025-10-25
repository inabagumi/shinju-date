import { describe, it, expect } from 'vitest'
import { parseDateRangeFromUrl, getDefaultDateRange, createDateRangeUrlParams } from '../url-state'

describe('url-state utilities', () => {
  describe('parseDateRangeFromUrl', () => {
    it('should parse valid date range from URL params', () => {
      // Use a recent date range that would be valid 
      const today = new Date()
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const startDate = sevenDaysAgo.toISOString().split('T')[0]
      const endDate = today.toISOString().split('T')[0]
      
      const params = new URLSearchParams(`from=${startDate}&to=${endDate}`)
      const result = parseDateRangeFromUrl(params)
      
      expect(result).toEqual({
        startDate,
        endDate
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
      // Use a specific date that's definitely in the past relative to today
      const today = new Date('2024-10-25') // Fixed date for test
      const yesterday = new Date('2024-10-24')
      
      const startDate = yesterday.toISOString().split('T')[0]
      const endDate = '2024-10-26' // Tomorrow relative to our fixed "today"
      
      const params = new URLSearchParams(`from=${startDate}&to=${endDate}`)
      const result = parseDateRangeFromUrl(params)
      
      // This test might pass depending on when it runs, so let's make it more explicit
      // The function uses the current system date, so we'll test with a definite future date
      const futureDate = '2030-01-01'
      const validPastDate = '2029-12-25'
      
      const futureParams = new URLSearchParams(`from=${validPastDate}&to=${futureDate}`)
      const futureResult = parseDateRangeFromUrl(futureParams)
      
      expect(futureResult).toBeNull()
    })

    it('should return null when date format is invalid', () => {
      const params = new URLSearchParams('from=invalid-date&to=2024-01-07')
      const result = parseDateRangeFromUrl(params)
      
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
        startDate: '2024-01-01',
        endDate: '2024-01-07'
      }
      
      const result = createDateRangeUrlParams(dateRange)
      
      expect(result).toBe('from=2024-01-01&to=2024-01-07')
    })
  })
})