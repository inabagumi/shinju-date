import { describe, expect, it } from 'vitest'
import { formatDateTimeFromISO } from './format'

describe('formatDateTimeFromISO', () => {
  it('should format an ISO 8601 string in TIME_ZONE', () => {
    expect(formatDateTimeFromISO('2026-03-25T16:22:03Z')).toBe(
      '2026/03/26 01:22:03',
    )
  })

  it('should omit seconds when includeSeconds is false', () => {
    expect(
      formatDateTimeFromISO('2026-03-25T16:22:03Z', { includeSeconds: false }),
    ).toBe('2026/03/26 01:22')
  })
})
