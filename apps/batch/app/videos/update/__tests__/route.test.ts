import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const limit = vi.fn()
const scraper = { addNewVideos: vi.fn() }
const createScraper = vi.fn(() => scraper)
const finishVideoSync = vi.fn()

vi.mock('@/lib/ratelimit', () => ({
  talentsUpdate: { limit: vi.fn() },
  videosBackfill: { limit: vi.fn() },
  videosCheck: { limit: vi.fn() },
  videosCheckAll: { limit: vi.fn() },
  videosCheckRecent: { limit: vi.fn() },
  videosUpdate: { limit },
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
  return new NextRequest(`http://localhost:5000/videos/update${search}`, {
    method: 'POST',
  })
}

describe('POST /videos/update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    limit.mockResolvedValue({ success: true })
    scraper.addNewVideos.mockResolvedValue(false)
  })

  it('adds new YouTube videos by default', async () => {
    scraper.addNewVideos.mockResolvedValue(true)

    const response = await POST(createRequest())

    expect(response.status).toBe(204)
    expect(limit).toHaveBeenCalledWith('videos:update:youtube')
    expect(createScraper).toHaveBeenCalledWith('youtube')
    expect(scraper.addNewVideos).toHaveBeenCalledTimes(1)
    expect(finishVideoSync).toHaveBeenCalledWith(
      expect.objectContaining({ changed: true }),
    )
  })

  it('adds new Twitch videos for provider=twitch', async () => {
    const response = await POST(createRequest('?provider=twitch'))

    expect(response.status).toBe(204)
    expect(limit).toHaveBeenCalledWith('videos:update:twitch')
    expect(createScraper).toHaveBeenCalledWith('twitch')
    expect(finishVideoSync).toHaveBeenCalledWith(
      expect.objectContaining({ changed: false }),
    )
  })

  it('stamps the videos and the last sync with the same time', async () => {
    await POST(createRequest())

    const [now] = scraper.addNewVideos.mock.calls[0] ?? []

    expect(now).toBeDefined()
    expect(finishVideoSync).toHaveBeenCalledWith(
      expect.objectContaining({ now }),
    )
  })

  it('rejects an unknown provider', async () => {
    const response = await POST(createRequest('?provider=niconico'))

    expect(response.status).toBe(400)
    expect(limit).not.toHaveBeenCalled()
    expect(createScraper).not.toHaveBeenCalled()
  })

  it('answers 500 when the crawl fails', async () => {
    scraper.addNewVideos.mockRejectedValue(new Error('quota exceeded'))

    const response = await POST(createRequest())

    expect(response.status).toBe(500)
    expect(finishVideoSync).not.toHaveBeenCalled()
  })
})
