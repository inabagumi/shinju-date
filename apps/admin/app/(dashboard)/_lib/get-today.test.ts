import { TIME_ZONE } from '@shinju-date/constants'
import { describe, expect, it, vi } from 'vitest'
import { getToday } from './get-today'

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
}))

describe('getToday', () => {
  it('returns the date of the time zone', async () => {
    vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockReturnValueOnce(
      Temporal.Instant.from('2026-11-16T15:30:00Z').toZonedDateTimeISO(
        TIME_ZONE,
      ),
    )

    // 2026-11-17 00:30 in JST
    await expect(getToday()).resolves.toBe('2026-11-17')
  })
})
