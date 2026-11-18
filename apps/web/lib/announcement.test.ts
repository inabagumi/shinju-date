import { describe, expect, test } from 'vitest'
import type { Announcement } from '@/lib/data/announcements'
import { selectCurrentAnnouncement } from './announcement'

function createAnnouncement(
  id: string,
  startAt: string,
  endAt: string,
): Announcement {
  return {
    end_at: endAt,
    id,
    level: 'info',
    message: `お知らせ ${id}`,
    start_at: startAt,
  }
}

const NOW = Temporal.Instant.from('2026-11-17T03:00:00Z')

describe('selectCurrentAnnouncement', () => {
  test('returns null when there are no announcements', () => {
    expect(selectCurrentAnnouncement([], NOW)).toBeNull()
  })

  test('returns the first of the announcements whose periods overlap', () => {
    const newer = createAnnouncement(
      'newer',
      '2026-11-16T00:00:00+00:00',
      '2026-11-18T00:00:00+00:00',
    )
    const older = createAnnouncement(
      'older',
      '2026-11-10T00:00:00+00:00',
      '2026-11-20T00:00:00+00:00',
    )

    expect(selectCurrentAnnouncement([newer, older], NOW)).toBe(newer)
  })

  test('skips the announcements that have not started yet', () => {
    const upcoming = createAnnouncement(
      'upcoming',
      '2026-11-17T03:00:01+00:00',
      '2026-11-18T00:00:00+00:00',
    )
    const current = createAnnouncement(
      'current',
      '2026-11-10T00:00:00+00:00',
      '2026-11-20T00:00:00+00:00',
    )

    expect(selectCurrentAnnouncement([upcoming, current], NOW)).toBe(current)
    expect(selectCurrentAnnouncement([upcoming], NOW)).toBeNull()
  })

  test('skips the announcements that have already ended', () => {
    const ended = createAnnouncement(
      'ended',
      '2026-11-10T00:00:00+00:00',
      '2026-11-17T02:59:59+00:00',
    )

    expect(selectCurrentAnnouncement([ended], NOW)).toBeNull()
  })

  test('includes the start and the end of the period', () => {
    const starting = createAnnouncement(
      'starting',
      '2026-11-17T12:00:00+09:00',
      '2026-11-18T00:00:00+00:00',
    )
    const ending = createAnnouncement(
      'ending',
      '2026-11-10T00:00:00+00:00',
      '2026-11-17T03:00:00+00:00',
    )

    expect(selectCurrentAnnouncement([starting], NOW)).toBe(starting)
    expect(selectCurrentAnnouncement([ending], NOW)).toBe(ending)
  })
})
