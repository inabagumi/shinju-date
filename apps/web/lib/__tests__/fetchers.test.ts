import { beforeEach, describe, expect, test, vi } from 'vitest'

const query = vi.hoisted(() => ({
  eq: vi.fn(),
  gte: vi.fn(),
  in: vi.fn(),
  limit: vi.fn(),
  lte: vi.fn(),
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

import { fetchDashboardVideos } from '../fetchers'

describe('fetchDashboardVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.gte.mockReturnValue(query)
    query.in.mockReturnValue(query)
    query.lte.mockReturnValue(query)
    query.neq.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.limit.mockResolvedValue({ data: [], error: null })
  })

  test('only requests PUBLISHED videos for the recent-videos tab', async () => {
    await fetchDashboardVideos()

    expect(query.eq).toHaveBeenCalledWith('status', 'PUBLISHED')
    expect(query.in).not.toHaveBeenCalledWith('status', ['PUBLISHED', 'ENDED'])
  })
})
