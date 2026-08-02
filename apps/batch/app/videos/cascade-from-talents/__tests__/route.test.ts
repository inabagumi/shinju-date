import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSupabaseClient = {}
const mockRatelimit = {
  limit: vi.fn(),
}
const mockCascadeVideosFromTalents = vi.fn()
const mockRevalidateTags = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabaseClient: mockSupabaseClient,
}))

vi.mock('@/lib/ratelimit', () => ({
  videosCascadeFromTalents: mockRatelimit,
}))

vi.mock('../_lib/cascade-from-talents', () => ({
  cascadeVideosFromTalents: mockCascadeVideosFromTalents,
}))

vi.mock('@shinju-date/web-cache', () => ({
  revalidateTags: mockRevalidateTags,
}))

vi.mock('@shinju-date/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@sentry/nextjs', () => ({
  captureCheckIn: vi.fn(() => 'mock-check-in-id'),
  captureException: vi.fn(),
  flush: vi.fn(),
}))

vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void) => {
    fn()
  }),
}))

describe('POST /videos/cascade-from-talents', () => {
  let POST: (request: Request) => Promise<Response>

  beforeEach(async () => {
    const module = await import('../route')
    POST = module.POST
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns cascade result and revalidates when work was done', async () => {
    mockRatelimit.limit.mockResolvedValue({ success: true })
    mockCascadeVideosFromTalents.mockResolvedValue({
      restored: 3,
      softDeleted: 5,
    })
    mockRevalidateTags.mockResolvedValue(undefined)

    const request = new Request(
      'http://localhost:5000/videos/cascade-from-talents',
      { method: 'POST' },
    )
    const response = await POST(request)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      restored: 3,
      softDeleted: 5,
    })
    expect(mockCascadeVideosFromTalents).toHaveBeenCalledWith(
      mockSupabaseClient,
    )
    expect(mockRevalidateTags).toHaveBeenCalledWith(['videos', 'talents'], {
      signal: request.signal,
    })
  })

  it('skips revalidation when nothing changed', async () => {
    mockRatelimit.limit.mockResolvedValue({ success: true })
    mockCascadeVideosFromTalents.mockResolvedValue({
      restored: 0,
      softDeleted: 0,
    })

    const request = new Request(
      'http://localhost:5000/videos/cascade-from-talents',
      { method: 'POST' },
    )
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockRevalidateTags).not.toHaveBeenCalled()
  })

  it('returns 429 when rate limited', async () => {
    mockRatelimit.limit.mockResolvedValue({ success: false })

    const response = await POST(
      new Request('http://localhost:5000/videos/cascade-from-talents', {
        method: 'POST',
      }),
    )

    expect(response.status).toBe(429)
    expect(mockCascadeVideosFromTalents).not.toHaveBeenCalled()
  })

  it('returns 500 when cascade fails', async () => {
    mockRatelimit.limit.mockResolvedValue({ success: true })
    mockCascadeVideosFromTalents.mockRejectedValue(new Error('boom'))

    const response = await POST(
      new Request('http://localhost:5000/videos/cascade-from-talents', {
        method: 'POST',
      }),
    )

    expect(response.status).toBe(500)
  })
})
