import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const limit = vi.fn()
const createScraper = vi.fn(() => ({ provider: 'youtube' }))
const revalidateTags = vi.fn()
const workOffBackfillQueue = vi.fn()

vi.mock('@/lib/ratelimit', () => ({
  talentsUpdate: { limit: vi.fn() },
  videosBackfill: { limit },
  videosCheck: { limit: vi.fn() },
  videosCheckAll: { limit: vi.fn() },
  videosCheckRecent: { limit: vi.fn() },
  videosUpdate: { limit: vi.fn() },
}))
vi.mock('@/lib/redis', () => ({ redisClient: {} }))
vi.mock('@/lib/scraper', () => ({ createScraper }))
vi.mock('@/lib/video-backfill', () => ({ workOffBackfillQueue }))
vi.mock('@shinju-date/web-cache', () => ({ revalidateTags }))

vi.mock('@shinju-date/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/nextjs', () => ({
  captureCheckIn: vi.fn(() => 'check-in-id'),
  captureException: vi.fn(),
  flush: vi.fn(),
}))

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: vi.fn((callback: () => unknown) => callback()),
}))

const { POST } = await import('../route')

function createRequest(): NextRequest {
  return new NextRequest('http://localhost:5000/videos/backfill', {
    method: 'POST',
  })
}

describe('POST /videos/backfill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    limit.mockResolvedValue({ success: true })
    workOffBackfillQueue.mockResolvedValue({ added: 0, jobs: 0 })
  })

  it('works off the queue with its own rate limit', async () => {
    const response = await POST(createRequest())

    expect(response.status).toBe(204)
    expect(limit).toHaveBeenCalledWith('videos:backfill')
    expect(workOffBackfillQueue).toHaveBeenCalledTimes(1)
    expect(revalidateTags).not.toHaveBeenCalled()
  })

  it('creates one scraper per provider', async () => {
    await POST(createRequest())

    const [{ getScraper }] = workOffBackfillQueue.mock.calls[0] ?? []

    expect(getScraper('youtube')).toBe(getScraper('youtube'))
    getScraper('twitch')
    expect(createScraper.mock.calls).toEqual([['youtube'], ['twitch']])
  })

  it('refreshes the public site after videos were added', async () => {
    workOffBackfillQueue.mockResolvedValue({ added: 3, jobs: 1 })

    await POST(createRequest())

    expect(revalidateTags).toHaveBeenCalledWith(['videos'], expect.anything())
  })

  it('does not run again right after the previous run', async () => {
    limit.mockResolvedValue({ success: false })

    const response = await POST(createRequest())

    expect(response.status).toBe(429)
    expect(workOffBackfillQueue).not.toHaveBeenCalled()
  })

  it('reports a run that fails', async () => {
    workOffBackfillQueue.mockRejectedValue(new Error('redis unavailable'))

    const response = await POST(createRequest())

    expect(response.status).toBe(500)
  })
})
