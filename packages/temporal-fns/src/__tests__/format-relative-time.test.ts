import { Temporal } from 'temporal-polyfill'
import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from '../format-relative-time'

describe('formatRelativeTime', () => {
  // Use a fixed reference time for consistent testing
  const referenceTime = Temporal.Instant.from('2024-01-15T12:00:00Z')

  describe('past times', () => {
    it('formats times less than 1 minute ago', () => {
      const time = Temporal.Instant.from('2024-01-15T11:59:30Z') // 30 seconds ago
      expect(formatRelativeTime(time, 'ja', referenceTime)).toBe('30 秒前')
    })

    it('formats times in minutes', () => {
      const time = Temporal.Instant.from('2024-01-15T11:55:00Z') // 5 minutes ago
      expect(formatRelativeTime(time, 'ja', referenceTime)).toBe('5 分前')
    })

    it('formats times in hours', () => {
      const time = Temporal.Instant.from('2024-01-15T10:00:00Z') // 2 hours ago
      expect(formatRelativeTime(time, 'ja', referenceTime)).toBe('2 時間前')
    })

    it('formats times in days', () => {
      const time = Temporal.Instant.from('2024-01-13T12:00:00Z') // 2 days ago
      // Intl.RelativeTimeFormat may use "一昨日" for 2 days ago
      const result = formatRelativeTime(time, 'ja', referenceTime)
      expect(result).toMatch(/日前|一昨日/)
    })

    it('formats times in weeks', () => {
      const time = Temporal.Instant.from('2024-01-01T12:00:00Z') // 2 weeks ago
      expect(formatRelativeTime(time, 'ja', referenceTime)).toBe('2 週間前')
    })

    it('formats times in months', () => {
      const time = Temporal.Instant.from('2023-11-15T12:00:00Z') // 2 months ago
      expect(formatRelativeTime(time, 'ja', referenceTime)).toBe('2 か月前')
    })

    it('formats times in years', () => {
      const time = Temporal.Instant.from('2022-01-15T12:00:00Z') // 2 years ago
      expect(formatRelativeTime(time, 'ja', referenceTime)).toBe('2 年前')
    })
  })

  describe('future times', () => {
    it('formats future times in seconds', () => {
      const time = Temporal.Instant.from('2024-01-15T12:00:30Z') // 30 seconds from now
      expect(formatRelativeTime(time, 'ja', referenceTime)).toBe('30 秒後')
    })

    it('formats future times in minutes', () => {
      const time = Temporal.Instant.from('2024-01-15T12:05:00Z') // 5 minutes from now
      expect(formatRelativeTime(time, 'ja', referenceTime)).toBe('5 分後')
    })

    it('formats future times in hours', () => {
      const time = Temporal.Instant.from('2024-01-15T14:00:00Z') // 2 hours from now
      expect(formatRelativeTime(time, 'ja', referenceTime)).toBe('2 時間後')
    })

    it('formats future times in days', () => {
      const time = Temporal.Instant.from('2024-01-17T12:00:00Z') // 2 days from now
      // Intl.RelativeTimeFormat may use "明後日" for 2 days from now
      const result = formatRelativeTime(time, 'ja', referenceTime)
      expect(result).toMatch(/日後|明後日/)
    })
  })

  describe('with ZonedDateTime', () => {
    it('accepts ZonedDateTime and formats correctly', () => {
      const time = Temporal.ZonedDateTime.from({
        day: 15,
        hour: 11,
        minute: 55,
        month: 1,
        second: 0,
        timeZone: 'UTC',
        year: 2024,
      })
      expect(formatRelativeTime(time, 'ja', referenceTime)).toBe('5 分前')
    })
  })

  describe('edge cases', () => {
    it('formats exactly now', () => {
      const result = formatRelativeTime(referenceTime, 'ja', referenceTime)
      // Intl.RelativeTimeFormat with numeric: 'auto' returns "今" for 0 seconds
      expect(result).toBe('今')
    })

    it('handles times at boundary between units', () => {
      const time = Temporal.Instant.from('2024-01-15T11:00:00Z') // Exactly 1 hour ago
      expect(formatRelativeTime(time, 'ja', referenceTime)).toBe('1 時間前')
    })
  })

  describe('different locales', () => {
    it('formats in English', () => {
      const time = Temporal.Instant.from('2024-01-15T11:55:00Z') // 5 minutes ago
      const result = formatRelativeTime(time, 'en', referenceTime)
      expect(result).toBe('5 minutes ago')
    })

    it('formats in Japanese (default)', () => {
      const time = Temporal.Instant.from('2024-01-15T11:55:00Z') // 5 minutes ago
      expect(formatRelativeTime(time, 'ja', referenceTime)).toBe('5 分前')
    })
  })

  describe('uses current time when not specified', () => {
    it('formats without providing "now" parameter', () => {
      // This test will use the actual current time
      const pastTime = Temporal.Now.instant().subtract({ minutes: 5 })
      const result = formatRelativeTime(pastTime, 'ja')
      expect(result).toMatch(/分前/)
    })
  })
})
