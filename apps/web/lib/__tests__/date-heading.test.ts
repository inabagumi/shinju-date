import { describe, expect, test } from 'vitest'
import { formatDateHeading } from '../date-heading'

const today = Temporal.PlainDate.from('2026-11-14')

describe('formatDateHeading', () => {
  test('should name today, yesterday and tomorrow', () => {
    expect(formatDateHeading(today, today)).toBe('今日')
    expect(formatDateHeading(today.subtract({ days: 1 }), today)).toBe('昨日')
    expect(formatDateHeading(today.add({ days: 1 }), today)).toBe('明日')
  })

  test('should show the month, day and weekday of other dates', () => {
    expect(
      formatDateHeading(Temporal.PlainDate.from('2026-11-12'), today),
    ).toBe('11月12日（木）')
    expect(
      formatDateHeading(Temporal.PlainDate.from('2026-11-16'), today),
    ).toBe('11月16日（月）')
    expect(
      formatDateHeading(Temporal.PlainDate.from('2026-11-08'), today),
    ).toBe('11月8日（日）')
  })

  test('should show the year of dates in another year', () => {
    expect(
      formatDateHeading(Temporal.PlainDate.from('2025-12-31'), today),
    ).toBe('2025年12月31日（水）')
    expect(
      formatDateHeading(
        Temporal.PlainDate.from('2027-01-01'),
        Temporal.PlainDate.from('2026-12-30'),
      ),
    ).toBe('2027年1月1日（金）')
  })

  test('should name yesterday across the new year', () => {
    expect(
      formatDateHeading(
        Temporal.PlainDate.from('2026-12-31'),
        Temporal.PlainDate.from('2027-01-01'),
      ),
    ).toBe('昨日')
  })
})
