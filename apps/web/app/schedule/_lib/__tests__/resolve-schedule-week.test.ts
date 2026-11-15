import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/server', () => ({
  connection: vi.fn(() => Promise.resolve()),
}))

import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { resolveScheduleWeek } from '../resolve-schedule-week'

function params(date: string) {
  return Promise.resolve({ date })
}

describe('resolveScheduleWeek', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  test('should return the Monday of the week of the date', async () => {
    expect((await resolveScheduleWeek(params('2026-11-12'))).toString()).toBe(
      '2026-11-09',
    )
    expect((await resolveScheduleWeek(params('2027-01-01'))).toString()).toBe(
      '2026-12-28',
    )
    expect(connection).not.toHaveBeenCalled()
  })

  test('should render the not-found page for a value that is not a date', async () => {
    await expect(resolveScheduleWeek(params('2026-W46'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    )
    await expect(resolveScheduleWeek(params('2026-02-30'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    )
    expect(notFound).toHaveBeenCalledTimes(2)
  })

  test('should return the week of today in Japan without the date', async () => {
    // 00:30 on Monday, 16 November 2026 in Japan, still Sunday in UTC
    vi.spyOn(Temporal.Now, 'instant').mockReturnValue(
      Temporal.Instant.from('2026-11-15T15:30:00Z'),
    )

    expect((await resolveScheduleWeek()).toString()).toBe('2026-11-16')
    expect(connection).toHaveBeenCalled()
  })
})
