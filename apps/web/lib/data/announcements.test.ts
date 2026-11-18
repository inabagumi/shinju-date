import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const query = vi.hoisted(() => ({
  eq: vi.fn(),
  gt: vi.fn(),
  gte: vi.fn(),
  in: vi.fn(),
  is: vi.fn(),
  limit: vi.fn(),
  lt: vi.fn(),
  lte: vi.fn(),
  maybeSingle: vi.fn(),
  neq: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
}))

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseClient: {
    from: vi.fn(() => query),
  },
}))

import { cacheLife, cacheTag } from 'next/cache'
import { supabaseClient } from '@/lib/supabase'
import { fetchActiveAnnouncements } from './announcements'

describe('fetchActiveAnnouncements', () => {
  const ANNOUNCEMENT = {
    end_at: '2026-11-20T00:00:00+00:00',
    id: '5b0e8a2c-6d4f-4c1a-9e3b-2f7a1c0d4e03',
    level: 'info',
    message: 'メンテナンスのお知らせ',
    start_at: '2026-11-10T00:00:00+00:00',
  } as const

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Temporal.Now, 'instant').mockReturnValue(
      Temporal.Instant.from('2026-11-17T03:00:00Z'),
    )

    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.gt.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.limit.mockResolvedValue({ data: [ANNOUNCEMENT], error: null })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('requests the enabled announcements that have not ended, newest first', async () => {
    await expect(fetchActiveAnnouncements()).resolves.toEqual([ANNOUNCEMENT])

    expect(supabaseClient.from).toHaveBeenCalledWith('announcements')
    expect(query.select).toHaveBeenCalledWith(
      'id, message, level, start_at, end_at',
    )
    expect(query.eq).toHaveBeenCalledWith('enabled', true)
    expect(query.gt).toHaveBeenCalledWith('end_at', '2026-11-17T03:00:00Z')
    expect(query.lte).not.toHaveBeenCalled()
    expect(query.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    })
    expect(query.limit).toHaveBeenCalledWith(10)
    expect(cacheLife).toHaveBeenCalledWith('minutes')
    expect(cacheTag).toHaveBeenCalledWith('announcements')
  })

  test('throws when the announcements cannot be fetched', async () => {
    query.limit.mockResolvedValue({ data: null, error: { message: 'failed' } })

    await expect(fetchActiveAnnouncements()).rejects.toThrow('failed')
  })
})
