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
    client: { from: vi.fn(() => query) },
    query,
  }
})

vi.mock('@/lib/supabase', () => ({
  supabaseClient: mocks.client,
}))

import { GET } from '../route'

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
      error: { message: 'failed' },
    })

    const response = await get()

    expect(response.status).toBe(500)
  })
})
