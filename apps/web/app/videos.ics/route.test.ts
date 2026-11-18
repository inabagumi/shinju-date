// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const query = {
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
    client: { from: vi.fn(() => query) },
    logger: { error: vi.fn() },
    query,
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
vi.mock('@/lib/data/videos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/data/videos')>()

  return {
    ...actual,
    fetchCalendarVideos: (
      ...args: Parameters<typeof actual.fetchCalendarVideos>
    ) => {
      const key = JSON.stringify(args)

      if (!mocks.cacheEntries.has(key)) {
        mocks.cacheEntries.set(key, actual.fetchCalendarVideos(...args))
      }

      return mocks.cacheEntries.get(key)
    },
  }
})

import { GET } from './route'

const TALENT_A = '0f6b7c84-1a1e-4b4e-9d3a-5c7a0c1e2f01'
const TALENT_B = '7d2e4b1a-3c5f-4e6a-8b9c-0d1e2f3a4b02'

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

function get(search = ''): Promise<Response> {
  return GET(new NextRequest(`https://shinju.date/videos.ics${search}`))
}

describe('GET /videos.ics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cacheEntries.clear()
    vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockImplementation((timeZone) =>
      Temporal.Instant.from('2026-11-15T03:20:00Z').toZonedDateTimeISO(
        timeZone ?? 'UTC',
      ),
    )

    for (const method of ['eq', 'in', 'lt', 'order', 'select'] as const) {
      mocks.query[method].mockReturnValue(mocks.query)
    }

    mocks.query.limit.mockResolvedValue({ data: [VIDEO], error: null })
  })

  it('returns the latest videos of every talent without parameters', async () => {
    const response = await get()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(
      'text/calendar; charset=UTF-8',
    )
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=300, s-maxage=900, stale-while-revalidate=3600',
    )

    const body = await response.text()

    expect(body).toContain('SUMMARY:歌枠')
    expect(body).toContain('UID:video-1@shinju.date')
    expect(mocks.client.from).toHaveBeenCalledWith('videos')
    expect(mocks.query.lt).toHaveBeenCalledWith(
      'published_at',
      '2026-11-22T03:00:00Z',
    )
    expect(mocks.query.order).toHaveBeenCalledWith('published_at', {
      ascending: false,
    })
    expect(mocks.query.limit).toHaveBeenCalledWith(100)
    expect(mocks.query.in).not.toHaveBeenCalled()
    expect(mocks.query.eq).not.toHaveBeenCalled()
  })

  it('returns the videos of the given talent', async () => {
    const response = await get(`?talent=${TALENT_A}`)

    expect(response.status).toBe(200)
    expect(mocks.query.in).toHaveBeenCalledWith('talent_id', [TALENT_A])
  })

  it('returns the videos of any of the given talents', async () => {
    await get(
      `?talent=${TALENT_B}&talent=${TALENT_A.toUpperCase()}&talent=${TALENT_B}`,
    )

    expect(mocks.query.in).toHaveBeenCalledWith('talent_id', [
      TALENT_A,
      TALENT_B,
    ])
  })

  it('does not query Supabase again for the same conditions', async () => {
    await get(`?kind=short&talent=${TALENT_B}&talent=${TALENT_A}`)
    const response = await get(
      `?talent=${TALENT_A.toUpperCase()}&talent=${TALENT_B}&kind=short&talent=${TALENT_A}`,
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('UID:video-1@shinju.date')
    expect(mocks.client.from).toHaveBeenCalledOnce()
    expect(mocks.query.limit).toHaveBeenCalledOnce()
  })

  it('queries Supabase again for other conditions', async () => {
    await get(`?talent=${TALENT_A}`)
    await get(`?talent=${TALENT_B}`)

    expect(mocks.client.from).toHaveBeenCalledTimes(2)
  })

  it('leaves out the videos without a platform source', async () => {
    mocks.query.limit.mockResolvedValue({
      data: [
        VIDEO,
        { ...VIDEO, id: 'video-2', twitch_video: null, youtube_video: null },
      ],
      error: null,
    })

    const body = await (await get()).text()

    expect(body).toContain('UID:video-1@shinju.date')
    expect(body).not.toContain('UID:video-2@shinju.date')
  })

  it.each(['standard', 'short'])(
    'returns only the videos of kind=%s',
    async (kind) => {
      await get(`?kind=${kind}`)

      expect(mocks.query.eq).toHaveBeenCalledWith('video_kind', kind)
      expect(mocks.query.in).not.toHaveBeenCalled()
    },
  )

  it('treats an unknown kind as no kind', async () => {
    await get('?kind=live')

    expect(mocks.query.eq).not.toHaveBeenCalled()
  })

  it('combines the talents and the kind', async () => {
    await get(`?kind=short&talent=${TALENT_A}`)

    expect(mocks.query.in).toHaveBeenCalledWith('talent_id', [TALENT_A])
    expect(mocks.query.eq).toHaveBeenCalledWith('video_kind', 'short')
  })

  it('returns a calendar without events when nothing matches', async () => {
    mocks.query.limit.mockResolvedValue({ data: [], error: null })

    const response = await get(`?talent=${TALENT_A}`)
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain('BEGIN:VCALENDAR')
    expect(body).not.toContain('BEGIN:VEVENT')
    // The unknown talent still narrows the calendar instead of falling back
    expect(mocks.query.in).toHaveBeenCalledWith('talent_id', [TALENT_A])
  })

  it.each([
    '?talent=abc',
    '?talent=',
    `?talent=${TALENT_A}&talent=${TALENT_B}x`,
  ])('answers 400 for talents that are not UUIDs (%s)', async (search) => {
    const response = await get(search)

    expect(response.status).toBe(400)
    expect(mocks.client.from).not.toHaveBeenCalled()
  })

  it('answers 500 when the videos cannot be fetched', async () => {
    mocks.query.limit.mockResolvedValue({
      data: null,
      error: { message: 'relation "videos" does not exist' },
    })

    const response = await get()

    expect(response.status).toBe(500)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.text()).not.toContain('relation')
    expect(mocks.logger.error).toHaveBeenCalledOnce()
  })
})
