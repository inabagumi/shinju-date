import { Temporal } from 'temporal-polyfill'
import { describe, expect, it } from 'vitest'
import getMondayOfWeek from '../get-monday-of-week.js'

describe('getMondayOfWeek', () => {
  it('should return the Monday date for a Monday', () => {
    // Monday, October 13, 2025
    const dateTime = Temporal.ZonedDateTime.from({
      day: 13,
      hour: 12,
      month: 10,
      timeZone: 'Asia/Tokyo',
      year: 2025,
    })

    const result = getMondayOfWeek(dateTime)
    expect(result).toBe('20251013')
  })

  it('should return the Monday date for a Tuesday', () => {
    // Tuesday, October 14, 2025 -> Monday, October 13, 2025
    const dateTime = Temporal.ZonedDateTime.from({
      day: 14,
      hour: 12,
      month: 10,
      timeZone: 'Asia/Tokyo',
      year: 2025,
    })

    const result = getMondayOfWeek(dateTime)
    expect(result).toBe('20251013')
  })

  it('should return the Monday date for a Wednesday', () => {
    // Wednesday, October 15, 2025 -> Monday, October 13, 2025
    const dateTime = Temporal.ZonedDateTime.from({
      day: 15,
      hour: 12,
      month: 10,
      timeZone: 'Asia/Tokyo',
      year: 2025,
    })

    const result = getMondayOfWeek(dateTime)
    expect(result).toBe('20251013')
  })

  it('should return the Monday date for a Sunday', () => {
    // Sunday, October 19, 2025 -> Monday, October 13, 2025
    const dateTime = Temporal.ZonedDateTime.from({
      day: 19,
      hour: 12,
      month: 10,
      timeZone: 'Asia/Tokyo',
      year: 2025,
    })

    const result = getMondayOfWeek(dateTime)
    expect(result).toBe('20251013')
  })

  it('should return the correct Monday for dates at year boundaries', () => {
    // Friday, January 3, 2025 -> Monday, December 30, 2024
    const dateTime = Temporal.ZonedDateTime.from({
      day: 3,
      hour: 12,
      month: 1,
      timeZone: 'Asia/Tokyo',
      year: 2025,
    })

    const result = getMondayOfWeek(dateTime)
    expect(result).toBe('20241230')
  })

  it('should handle different time zones correctly', () => {
    // Tuesday, October 14, 2025 in UTC -> Monday, October 13, 2025
    const dateTime = Temporal.ZonedDateTime.from({
      day: 14,
      hour: 12,
      month: 10,
      timeZone: 'UTC',
      year: 2025,
    })

    const result = getMondayOfWeek(dateTime)
    expect(result).toBe('20251013')
  })

  it('should handle dates at the beginning of a month', () => {
    // Sunday, June 1, 2025 -> Monday, May 26, 2025
    const dateTime = Temporal.ZonedDateTime.from({
      day: 1,
      hour: 12,
      month: 6,
      timeZone: 'Asia/Tokyo',
      year: 2025,
    })

    const result = getMondayOfWeek(dateTime)
    expect(result).toBe('20250526')
  })
})
