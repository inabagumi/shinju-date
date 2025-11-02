import { Temporal } from 'temporal-polyfill'
import { describe, expect, it } from 'vitest'
import toDBString from '../to-db-string.js'

describe('toDBString', () => {
  it('Temporal.Instant with fractional seconds should be truncated to the second', () => {
    const instantWithMillis = Temporal.Instant.from(
      '2025-11-02T10:30:00.123456Z',
    )
    const expected = '2025-11-02T10:30:00Z'
    expect(toDBString(instantWithMillis)).toBe(expected)
  })

  it('Temporal.Instant without fractional seconds should remain unchanged', () => {
    const instantWithoutMillis = Temporal.Instant.from('2025-11-02T10:30:00Z')
    const expected = '2025-11-02T10:30:00Z'
    expect(toDBString(instantWithoutMillis)).toBe(expected)
  })

  it('Temporal.ZonedDateTime with a specific timezone should be converted to UTC and truncated', () => {
    // JST (UTC+9) の日時
    const zonedDateTimeJST = Temporal.ZonedDateTime.from(
      '2025-11-02T19:30:00.987[Asia/Tokyo]',
    )
    // UTCに変換すると 2025-11-02T10:30:00.987Z となり、秒で切り捨てられる
    const expected = '2025-11-02T10:30:00Z'
    expect(toDBString(zonedDateTimeJST)).toBe(expected)
  })

  it('Temporal.ZonedDateTime at the beginning of a second should be converted to UTC correctly', () => {
    const zonedDateTimeJST = Temporal.ZonedDateTime.from(
      '2025-11-02T19:30:00[Asia/Tokyo]',
    )
    const expected = '2025-11-02T10:30:00Z'
    expect(toDBString(zonedDateTimeJST)).toBe(expected)
  })

  it('should handle rounding mode correctly (floor)', () => {
    // 限りなく次の秒に近い値でも、切り捨てられることを確認
    const nearlyNextSecond = Temporal.Instant.from(
      '2025-11-02T10:30:00.999999999Z',
    )
    const expected = '2025-11-02T10:30:00Z'
    expect(toDBString(nearlyNextSecond)).toBe(expected)
  })
})
