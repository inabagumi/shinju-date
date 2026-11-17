import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getDefaultDateRange,
  getEarliestDate,
  getToday,
  MAX_RANGE_DAYS,
  parseDate,
  parseDateFormat,
  validateDate,
  validateRange,
} from './date-window'

/** Fix the current time. The date is derived from the time zone that is asked for */
function mockNow(instant: string) {
  vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockImplementation(
    (timeZone = 'UTC') =>
      Temporal.Instant.from(instant).toZonedDateTimeISO(timeZone),
  )
}

function plainDate(value: string) {
  return Temporal.PlainDate.from(value)
}

describe('date-window', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // 2026-11-14 12:00 in JST
    mockNow('2026-11-14T03:00:00Z')
  })

  describe('getToday', () => {
    it('returns the date of the time zone', () => {
      expect(getToday().toString()).toBe('2026-11-14')
    })

    it('stays on the previous day until midnight of the time zone', () => {
      // 2026-11-16 23:59:59 in JST
      mockNow('2026-11-16T14:59:59Z')

      expect(getToday().toString()).toBe('2026-11-16')
    })

    it('moves to the next day at midnight of the time zone, while UTC is still on the previous day', () => {
      // 2026-11-17 00:00:00 in JST
      mockNow('2026-11-16T15:00:00Z')

      expect(getToday().toString()).toBe('2026-11-17')
    })
  })

  describe('getEarliestDate', () => {
    it('returns the first day of the window that ends today', () => {
      const earliest = getEarliestDate()

      expect(earliest.toString()).toBe('2026-08-17')
      expect(earliest.until(getToday()).days + 1).toBe(MAX_RANGE_DAYS)
    })
  })

  describe('getDefaultDateRange', () => {
    it('returns the 7 days that end today', () => {
      expect(getDefaultDateRange()).toEqual({
        endDate: '2026-11-14',
        startDate: '2026-11-08',
      })
    })
  })

  describe('parseDateFormat', () => {
    it('returns the date for a valid string', () => {
      expect(parseDateFormat('2026-11-10')?.toString()).toBe('2026-11-10')
    })

    it('returns dates outside the window', () => {
      expect(parseDateFormat('2026-11-15')?.toString()).toBe('2026-11-15')
      expect(parseDateFormat('2000-01-01')?.toString()).toBe('2000-01-01')
    })

    it.each([
      ['an empty string', ''],
      ['words', 'invalid-date'],
      ['a date with slashes', '2026/11/10'],
      ['a day that does not exist', '2026-09-31'],
    ])('rejects %s', (_, value) => {
      expect(parseDateFormat(value)).toBeNull()
    })
  })

  describe('parseDate', () => {
    it('returns the date for a valid string', () => {
      const date = parseDate('2026-11-10')

      expect(date).toBeInstanceOf(Temporal.PlainDate)
      expect(date?.toString()).toBe('2026-11-10')
    })

    it.each([
      ['an empty string', ''],
      ['words', 'invalid-date'],
      ['a date without dashes', '20261110'],
      ['a date with slashes', '2026/11/10'],
      ['a date without zero padding', '2026-11-1'],
      ['a date with a time', '2026-11-10T00:00:00'],
      ['a date with a calendar', '2026-11-10[u-ca=japanese]'],
      ['a date with surrounding spaces', ' 2026-11-10 '],
      ['a month that does not exist', '2026-13-01'],
      ['a day that does not exist', '2026-09-31'],
    ])('rejects %s', (_, value) => {
      expect(parseDate(value)).toBeNull()
    })

    it('accepts today and rejects tomorrow', () => {
      expect(parseDate('2026-11-14')?.toString()).toBe('2026-11-14')
      expect(parseDate('2026-11-15')).toBeNull()
    })

    it('accepts the earliest date and rejects the day before', () => {
      expect(parseDate('2026-08-17')?.toString()).toBe('2026-08-17')
      expect(parseDate('2026-08-16')).toBeNull()
    })

    it('moves the window at midnight of the time zone', () => {
      // 2026-11-16 23:59:59 in JST
      mockNow('2026-11-16T14:59:59Z')

      expect(parseDate('2026-11-17')).toBeNull()
      expect(parseDate('2026-08-19')?.toString()).toBe('2026-08-19')

      // 2026-11-17 00:00:00 in JST
      mockNow('2026-11-16T15:00:00Z')

      expect(parseDate('2026-11-17')?.toString()).toBe('2026-11-17')
      expect(parseDate('2026-08-19')).toBeNull()
      expect(parseDate('2026-08-20')?.toString()).toBe('2026-08-20')
    })

    it('uses the given date as today', () => {
      const today = plainDate('2026-01-31')

      expect(parseDate('2026-01-31', today)?.toString()).toBe('2026-01-31')
      expect(parseDate('2026-02-01', today)).toBeNull()
    })
  })

  describe('validateDate', () => {
    it('returns null for a date within the window', () => {
      expect(validateDate(plainDate('2026-11-14'))).toBeNull()
      expect(validateDate(plainDate('2026-10-01'))).toBeNull()
      expect(validateDate(plainDate('2026-08-17'))).toBeNull()
    })

    it('tells that a date is after today', () => {
      expect(validateDate(plainDate('2026-11-15'))).toBe('future')
    })

    it('tells that a date is before the window', () => {
      expect(validateDate(plainDate('2026-08-16'))).toBe('too-old')
    })
  })

  describe('validateRange', () => {
    it('accepts a single day', () => {
      expect(
        validateRange(plainDate('2026-11-10'), plainDate('2026-11-10')),
      ).toBeNull()
    })

    it('accepts a start before the end', () => {
      expect(
        validateRange(plainDate('2026-11-03'), plainDate('2026-11-10')),
      ).toBeNull()
    })

    it('tells that the start is after the end', () => {
      expect(
        validateRange(plainDate('2026-11-10'), plainDate('2026-11-09')),
      ).toBe('reversed')
    })

    it('accepts the longest range and rejects one more day', () => {
      // 2026-08-17 to 2026-11-14 is 90 days, counting both ends
      expect(
        validateRange(plainDate('2026-08-17'), plainDate('2026-11-14')),
      ).toBeNull()
      expect(
        validateRange(plainDate('2026-08-16'), plainDate('2026-11-14')),
      ).toBe('too-long')
    })

    it('counts days across years', () => {
      expect(
        validateRange(plainDate('2025-01-01'), plainDate('2026-11-14')),
      ).toBe('too-long')
    })
  })
})
