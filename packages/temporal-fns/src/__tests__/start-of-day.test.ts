import { Temporal } from 'temporal-polyfill'
import { describe, expect, it } from 'vitest'
import startOfDay from '../start-of-day'

describe('startOfDay', () => {
  it('should return start of day for ZonedDateTime', () => {
    const date = Temporal.ZonedDateTime.from({
      day: 14,
      hour: 15,
      microsecond: 456,
      millisecond: 123,
      minute: 30,
      month: 11,
      nanosecond: 789,
      second: 45,
      timeZone: 'Asia/Tokyo',
      year: 2025,
    })

    const result = startOfDay(date)

    expect(result.year).toBe(2025)
    expect(result.month).toBe(11)
    expect(result.day).toBe(14)
    expect(result.hour).toBe(0)
    expect(result.minute).toBe(0)
    expect(result.second).toBe(0)
    expect(result.millisecond).toBe(0)
    expect(result.microsecond).toBe(0)
    expect(result.nanosecond).toBe(0)
  })

  it('should return start of day for PlainDate', () => {
    const date = Temporal.PlainDate.from({ day: 14, month: 11, year: 2025 })

    const result = startOfDay(date)

    expect(result.year).toBe(2025)
    expect(result.month).toBe(11)
    expect(result.day).toBe(14)
  })

  it('should preserve timezone', () => {
    const date = Temporal.ZonedDateTime.from({
      day: 14,
      hour: 12,
      minute: 0,
      month: 11,
      second: 0,
      timeZone: 'America/New_York',
      year: 2025,
    })

    const result = startOfDay(date)

    expect(result.timeZoneId).toBe('America/New_York')
  })

  it('should handle midnight correctly', () => {
    const date = Temporal.ZonedDateTime.from({
      day: 14,
      hour: 0,
      minute: 0,
      month: 11,
      second: 0,
      timeZone: 'UTC',
      year: 2025,
    })

    const result = startOfDay(date)

    expect(result.equals(date)).toBe(true)
  })
})
