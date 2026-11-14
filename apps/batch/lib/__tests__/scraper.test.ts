import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseClient = {}
const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
const captureException = vi.fn()

vi.mock('@/lib/supabase', () => ({ supabaseClient }))
vi.mock('@shinju-date/logger', () => ({ logger }))
vi.mock('@sentry/nextjs', () => ({ captureException }))
vi.mock('@shinju-date/scraper/youtube', () => ({
  YouTubeScraper: class {
    readonly provider = 'youtube'

    constructor(readonly options: unknown) {}
  },
}))
vi.mock('@shinju-date/scraper/twitch', () => ({
  TwitchScraper: class {
    readonly provider = 'twitch'

    constructor(readonly options: unknown) {}
  },
}))

const { createScraper } = await import('../scraper')

interface CreatedScraper {
  options: {
    logger: unknown
    onError: (error: unknown, context: Record<string, unknown>) => void
    supabaseClient: unknown
  }
  provider: string
}

describe('createScraper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(['youtube', 'twitch'] as const)(
    'creates the %s scraper',
    (provider) => {
      const scraper = createScraper(provider) as unknown as CreatedScraper

      expect(scraper.provider).toBe(provider)
      expect(scraper.options.supabaseClient).toBe(supabaseClient)
      expect(scraper.options.logger).toBe(logger)
    },
  )

  it('sends failures that do not stop a run to Sentry', () => {
    const scraper = createScraper('twitch') as unknown as CreatedScraper
    const error = new Error('helix unavailable')

    scraper.options.onError(error, { twitchUserId: '1001' })

    expect(captureException).toHaveBeenCalledWith(error, {
      extra: { provider: 'twitch', twitchUserId: '1001' },
    })
  })
})
