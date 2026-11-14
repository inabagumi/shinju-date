import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const limits = {
  videosCheck: vi.fn(),
  videosCheckAll: vi.fn(),
  videosCheckRecent: vi.fn(),
}
const scraper = {
  refreshLiveVideos: vi.fn(),
  refreshRecentVideos: vi.fn(),
  removeUnavailableVideos: vi.fn(),
}
const createScraper = vi.fn(() => scraper)
const finishVideoSync = vi.fn()

vi.mock('@/lib/ratelimit', () => ({
  talentsUpdate: { limit: vi.fn() },
  videosBackfill: { limit: vi.fn() },
  videosCheck: { limit: limits.videosCheck },
  videosCheckAll: { limit: limits.videosCheckAll },
  videosCheckRecent: { limit: limits.videosCheckRecent },
  videosUpdate: { limit: vi.fn() },
}))
vi.mock('@/lib/scraper', () => ({ createScraper }))
vi.mock('@/lib/video-sync', () => ({ finishVideoSync }))

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

function createRequest(search = ''): NextRequest {
  return new NextRequest(`http://localhost:5000/videos/check${search}`, {
    method: 'POST',
  })
}

describe('POST /videos/check', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    for (const limit of Object.values(limits)) {
      limit.mockResolvedValue({ success: true })
    }

    for (const operation of Object.values(scraper)) {
      operation.mockResolvedValue(false)
    }
  })

  it.each([
    ['', 'youtube', 'refreshLiveVideos', 'videosCheck', 'videos:check:youtube'],
    [
      '?mode=recent',
      'youtube',
      'refreshRecentVideos',
      'videosCheckRecent',
      'videos:check:recent:youtube',
    ],
    [
      '?mode=all',
      'youtube',
      'removeUnavailableVideos',
      'videosCheckAll',
      'videos:check:all:youtube',
    ],
    [
      '?provider=twitch',
      'twitch',
      'refreshLiveVideos',
      'videosCheck',
      'videos:check:twitch',
    ],
    [
      '?provider=twitch&mode=recent',
      'twitch',
      'refreshRecentVideos',
      'videosCheckRecent',
      'videos:check:recent:twitch',
    ],
    [
      '?provider=twitch&mode=all',
      'twitch',
      'removeUnavailableVideos',
      'videosCheckAll',
      'videos:check:all:twitch',
    ],
  ] as const)(
    '%s runs %s.%s',
    async (search, provider, operation, ratelimit, ratelimitKey) => {
      const response = await POST(createRequest(search))

      expect(response.status).toBe(204)
      expect(limits[ratelimit]).toHaveBeenCalledWith(ratelimitKey)
      expect(createScraper).toHaveBeenCalledWith(provider)

      for (const [name, mock] of Object.entries(scraper)) {
        expect(mock).toHaveBeenCalledTimes(name === operation ? 1 : 0)
      }
    },
  )

  it('reports whether anything changed', async () => {
    scraper.refreshLiveVideos.mockResolvedValue(true)

    await POST(createRequest('?provider=twitch'))

    expect(finishVideoSync).toHaveBeenCalledWith(
      expect.objectContaining({ changed: true }),
    )
  })

  it('rejects an unknown mode', async () => {
    const response = await POST(createRequest('?mode=everything'))

    expect(response.status).toBe(400)
    expect(createScraper).not.toHaveBeenCalled()
  })

  it('answers 500 when the check fails', async () => {
    scraper.refreshLiveVideos.mockRejectedValue(new Error('quota exceeded'))

    const response = await POST(createRequest())

    expect(response.status).toBe(500)
    expect(finishVideoSync).not.toHaveBeenCalled()
  })
})
