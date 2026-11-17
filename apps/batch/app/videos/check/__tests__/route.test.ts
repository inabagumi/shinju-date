import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const acquireLock = vi.fn()
const releaseLock = vi.fn()
const scraper = {
  cleanUpImages: vi.fn(),
  refreshLiveVideos: vi.fn(),
  refreshRecentVideos: vi.fn(),
  removeUnavailableVideos: vi.fn(),
}
const createScraper = vi.fn(() => scraper)
const finishVideoSync = vi.fn()

vi.mock('@/lib/lock', () => ({ acquireLock, releaseLock }))
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

    acquireLock.mockResolvedValue('lock-value')

    for (const operation of Object.values(scraper)) {
      operation.mockResolvedValue(false)
    }
  })

  it.each([
    ['', 'youtube', 'refreshLiveVideos', 'videos:check'],
    [
      '?mode=recent',
      'youtube',
      'refreshRecentVideos',
      'videos:check:mode=recent',
    ],
    [
      '?mode=all',
      'youtube',
      'removeUnavailableVideos',
      'videos:check:mode=all',
    ],
    [
      '?provider=twitch',
      'twitch',
      'refreshLiveVideos',
      'videos:check:provider=twitch',
    ],
    [
      '?provider=twitch&mode=recent',
      'twitch',
      'refreshRecentVideos',
      'videos:check:mode=recent:provider=twitch',
    ],
    [
      '?provider=twitch&mode=all',
      'twitch',
      'removeUnavailableVideos',
      'videos:check:mode=all:provider=twitch',
    ],
  ] as const)(
    '%s runs %s.%s',
    async (search, provider, operation, identifier) => {
      const response = await POST(createRequest(search))

      expect(response.status).toBe(204)
      expect(acquireLock).toHaveBeenCalledWith(identifier, 130)
      expect(createScraper).toHaveBeenCalledWith(provider)

      for (const [name, mock] of Object.entries(scraper)) {
        if (name !== 'cleanUpImages') {
          expect(mock).toHaveBeenCalledTimes(name === operation ? 1 : 0)
        }
      }
    },
  )

  it.each([
    ['?mode=all', 'youtube'],
    ['?provider=twitch&mode=all', 'twitch'],
  ] as const)(
    '%s cleans up unused images after checking every video',
    async (search, provider) => {
      const response = await POST(createRequest(search))

      expect(response.status).toBe(204)
      expect(createScraper).toHaveBeenCalledWith(provider)
      expect(scraper.cleanUpImages).toHaveBeenCalledTimes(1)
      expect(
        scraper.removeUnavailableVideos.mock.invocationCallOrder[0],
      ).toBeLessThan(scraper.cleanUpImages.mock.invocationCallOrder[0] ?? 0)

      const [now] = scraper.removeUnavailableVideos.mock.calls[0] ?? []

      expect(scraper.cleanUpImages).toHaveBeenCalledWith(now)
    },
  )

  it.each([
    '',
    '?mode=recent',
    '?provider=twitch',
    '?provider=twitch&mode=recent',
  ])('%s leaves unused images alone', async (search) => {
    await POST(createRequest(search))

    expect(scraper.cleanUpImages).not.toHaveBeenCalled()
  })

  it('reports whether videos changed, whatever the clean-up did', async () => {
    scraper.removeUnavailableVideos.mockResolvedValue(true)

    const response = await POST(createRequest('?mode=all'))

    expect(response.status).toBe(204)
    expect(finishVideoSync).toHaveBeenCalledWith(
      expect.objectContaining({ changed: true }),
    )
  })

  it('reports whether anything changed', async () => {
    scraper.refreshLiveVideos.mockResolvedValue(true)

    await POST(createRequest('?provider=twitch'))

    expect(finishVideoSync).toHaveBeenCalledWith(
      expect.objectContaining({ changed: true }),
    )
  })

  it('rejects an unknown provider', async () => {
    const response = await POST(createRequest('?provider=niconico'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: expect.stringMatching(/^Invalid query parameters\. provider: /),
    })
    expect(createScraper).not.toHaveBeenCalled()
  })

  it('rejects an unknown mode', async () => {
    const response = await POST(createRequest('?mode=everything'))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: expect.stringMatching(/^Invalid query parameters\. mode: /),
    })
    expect(createScraper).not.toHaveBeenCalled()
  })

  it('answers 500 when the check fails', async () => {
    scraper.refreshLiveVideos.mockRejectedValue(new Error('quota exceeded'))

    const response = await POST(createRequest())

    expect(response.status).toBe(500)
    expect(finishVideoSync).not.toHaveBeenCalled()
  })
})
