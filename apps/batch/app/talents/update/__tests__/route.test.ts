import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const limit = vi.fn()
const scraper = { syncAccounts: vi.fn() }
const createScraper = vi.fn(() => scraper)
const revalidateTags = vi.fn()

vi.mock('@/lib/ratelimit', () => ({
  talentsUpdate: { limit },
  videosCheck: { limit: vi.fn() },
  videosCheckAll: { limit: vi.fn() },
  videosCheckRecent: { limit: vi.fn() },
  videosUpdate: { limit: vi.fn() },
}))
vi.mock('@/lib/scraper', () => ({ createScraper }))
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

function createRequest(search = ''): NextRequest {
  return new NextRequest(`http://localhost:5000/talents/update${search}`, {
    method: 'POST',
  })
}

describe('POST /talents/update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    limit.mockResolvedValue({ success: true })
    scraper.syncAccounts.mockResolvedValue(false)
  })

  it('syncs YouTube channels by default', async () => {
    const response = await POST(createRequest())

    expect(response.status).toBe(204)
    expect(limit).toHaveBeenCalledWith('channels:update:youtube')
    expect(createScraper).toHaveBeenCalledWith('youtube')
    expect(scraper.syncAccounts).toHaveBeenCalledTimes(1)
    expect(revalidateTags).not.toHaveBeenCalled()
  })

  it('syncs Twitch users for provider=twitch', async () => {
    scraper.syncAccounts.mockResolvedValue(true)

    const response = await POST(createRequest('?provider=twitch'))

    expect(response.status).toBe(204)
    expect(limit).toHaveBeenCalledWith('channels:update:twitch')
    expect(createScraper).toHaveBeenCalledWith('twitch')
    expect(revalidateTags).toHaveBeenCalledWith(['talents'], expect.anything())
  })

  it('rejects an unknown provider', async () => {
    const response = await POST(createRequest('?provider=niconico'))

    expect(response.status).toBe(400)
    expect(createScraper).not.toHaveBeenCalled()
  })
})
