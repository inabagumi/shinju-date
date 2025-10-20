import { formatDate } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'

/**
 * Get the Monday of the week for a given date
 * This is a helper function extracted for testing purposes
 */
export function getMondayOfWeek(dateTime: Temporal.ZonedDateTime): string {
  const dayOfWeek = dateTime.dayOfWeek // 1 = Monday, 7 = Sunday
  const daysToSubtract = dayOfWeek - 1
  const monday = dateTime.subtract({ days: daysToSubtract })
  return formatDate(monday)
}

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
})
