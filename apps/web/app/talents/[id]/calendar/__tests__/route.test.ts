// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const talentsQuery = {
    eq: vi.fn(),
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
    client: {
      from: vi.fn((table: string) =>
        table === 'talents' ? talentsQuery : videosQuery,
      ),
    },
    talentsQuery,
    videosQuery,
  }
})

vi.mock('@/lib/supabase', () => ({
  supabaseClient: mocks.client,
}))

import { GET } from '../route'

const TALENT_ID = '0f6b7c84-1a1e-4b4e-9d3a-5c7a0c1e2f01'

function get(id: string): Promise<Response> {
  return GET(new Request(`https://shinju.date/talents/${id}.ics`), {
    params: Promise.resolve({ id }),
  })
}

describe('GET /talents/[id].ics', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.talentsQuery.select.mockReturnValue(mocks.talentsQuery)

    for (const method of ['eq', 'in', 'lt', 'order', 'select'] as const) {
      mocks.videosQuery[method].mockReturnValue(mocks.videosQuery)
    }

    mocks.videosQuery.limit.mockResolvedValue({ data: [], error: null })
  })

  it('returns the videos of the talent', async () => {
    mocks.talentsQuery.eq.mockResolvedValue({ count: 1, error: null })

    const response = await get(TALENT_ID)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(
      'text/calendar; charset=UTF-8',
    )
    expect(mocks.videosQuery.in).toHaveBeenCalledWith('talent_id', [TALENT_ID])
    expect(mocks.videosQuery.eq).not.toHaveBeenCalled()
  })

  it('answers 404 for talents that do not exist', async () => {
    mocks.talentsQuery.eq.mockResolvedValue({ count: 0, error: null })

    const response = await get(TALENT_ID)

    expect(response.status).toBe(404)
    expect(mocks.client.from).not.toHaveBeenCalledWith('videos')
  })
})
