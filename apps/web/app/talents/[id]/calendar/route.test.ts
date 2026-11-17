// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const talentsQuery = {
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn(),
    select: vi.fn(),
  }
  const videosQuery = {
    eq: vi.fn(),
    in: vi.fn(),
    limit: vi.fn(),
    lt: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
  }

  return {
    // Entries of the `'use cache'` functions, keyed by their arguments
    cacheEntries: new Map<string, unknown>(),
    client: {
      from: vi.fn((table: string) =>
        table === 'talents' ? talentsQuery : videosQuery,
      ),
    },
    logger: { error: vi.fn() },
    talentsQuery,
    videosQuery,
  }
})

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

vi.mock('@shinju-date/logger', () => ({
  logger: mocks.logger,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseClient: mocks.client,
}))

// Vitest does not run `'use cache'`, so serve the second call with the same
// arguments from the entry of the first, as Next.js does
vi.mock('@/lib/fetchers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/fetchers')>()

  function cached<Args extends unknown[], Result>(
    name: string,
    fn: (...args: Args) => Promise<Result>,
  ): (...args: Args) => Promise<Result> {
    return (...args) => {
      const key = JSON.stringify([name, args])

      if (!mocks.cacheEntries.has(key)) {
        mocks.cacheEntries.set(key, fn(...args))
      }

      return mocks.cacheEntries.get(key) as Promise<Result>
    }
  }

  return {
    ...actual,
    fetchCalendarVideos: cached(
      'fetchCalendarVideos',
      actual.fetchCalendarVideos,
    ),
    fetchTalent: cached('fetchTalent', actual.fetchTalent),
  }
})

import { GET } from './route'

const TALENT_ID = '0f6b7c84-1a1e-4b4e-9d3a-5c7a0c1e2f01'

const TALENT = {
  id: TALENT_ID,
  name: '朝霧ミオ',
  twitch_users: [],
  youtube_channels: [],
}

const VIDEO = {
  duration: 'PT1H',
  id: 'video-1',
  platform: 'youtube',
  published_at: '2026-11-15T12:00:00Z',
  status: 'ENDED',
  talent: { name: '朝霧ミオ' },
  title: '歌枠',
  twitch_video: null,
  youtube_video: { youtube_video_id: 'abc123' },
}

function get(id: string): Promise<Response> {
  return GET(new Request(`https://shinju.date/talents/${id}.ics`), {
    params: Promise.resolve({ id }),
  })
}

describe('GET /talents/[id].ics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cacheEntries.clear()

    for (const method of ['eq', 'is', 'select'] as const) {
      mocks.talentsQuery[method].mockReturnValue(mocks.talentsQuery)
    }

    for (const method of ['eq', 'in', 'lt', 'order', 'select'] as const) {
      mocks.videosQuery[method].mockReturnValue(mocks.videosQuery)
    }

    mocks.talentsQuery.maybeSingle.mockResolvedValue({
      data: TALENT,
      error: null,
    })
    mocks.videosQuery.limit.mockResolvedValue({ data: [VIDEO], error: null })
  })

  it('returns the videos of the talent', async () => {
    const response = await get(TALENT_ID)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(
      'text/calendar; charset=UTF-8',
    )
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=300, s-maxage=900, stale-while-revalidate=3600',
    )
    expect(await response.text()).toContain('UID:video-1@shinju.date')
    expect(mocks.talentsQuery.eq).toHaveBeenCalledWith('id', TALENT_ID)
    expect(mocks.videosQuery.in).toHaveBeenCalledWith('talent_id', [TALENT_ID])
    expect(mocks.videosQuery.eq).not.toHaveBeenCalled()
  })

  it('narrows the videos by the ID of the fetched talent', async () => {
    await get(TALENT_ID.toUpperCase())

    expect(mocks.videosQuery.in).toHaveBeenCalledWith('talent_id', [TALENT_ID])
  })

  it('does not query Supabase again for the same talent', async () => {
    await get(TALENT_ID)
    const response = await get(TALENT_ID)

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('UID:video-1@shinju.date')
    expect(mocks.client.from).toHaveBeenCalledTimes(2)
    expect(mocks.talentsQuery.maybeSingle).toHaveBeenCalledOnce()
    expect(mocks.videosQuery.limit).toHaveBeenCalledOnce()
  })

  it('answers 404 for talents that do not exist or are not shown', async () => {
    mocks.talentsQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    })

    const response = await get(TALENT_ID)

    expect(response.status).toBe(404)
    expect(mocks.client.from).not.toHaveBeenCalledWith('videos')
  })

  it.each(['abc', 'not-a-uuid', `${TALENT_ID}x`])(
    'answers 404 for IDs that are not UUIDs (%s)',
    async (id) => {
      const response = await get(id)

      expect(response.status).toBe(404)
      expect(mocks.client.from).not.toHaveBeenCalled()
    },
  )

  it('answers 500 without the error message when the talent cannot be fetched', async () => {
    mocks.talentsQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'relation "talents" does not exist' },
    })

    const response = await get(TALENT_ID)

    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('relation')
    expect(mocks.logger.error).toHaveBeenCalledOnce()
    expect(mocks.client.from).not.toHaveBeenCalledWith('videos')
  })

  it('answers 500 without the error message when the videos cannot be fetched', async () => {
    mocks.videosQuery.limit.mockResolvedValue({
      data: null,
      error: { message: 'relation "videos" does not exist' },
    })

    const response = await get(TALENT_ID)

    expect(response.status).toBe(500)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.text()).not.toContain('relation')
    expect(mocks.logger.error).toHaveBeenCalledOnce()
  })
})
