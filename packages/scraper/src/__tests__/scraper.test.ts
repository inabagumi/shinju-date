import { Temporal } from 'temporal-polyfill'
import { describe, expect, it, vi } from 'vitest'
import { Scraper } from '../scraper.js'
import type {
  CrawlContext,
  ScraperOptions,
  TypedSupabaseClient,
} from '../types.js'

const supabaseClient = {} as TypedSupabaseClient

/**
 * A platform scraper reduced to what the base class provides.
 */
class ExampleScraper extends Scraper {
  readonly provider = 'example'

  context: CrawlContext<string> | undefined

  constructor(options: Omit<ScraperOptions, 'supabaseClient'> = {}) {
    super({ ...options, supabaseClient })
  }

  async addNewVideos(now?: Temporal.Instant): Promise<boolean> {
    this.context = this.createContext('fetcher', now)

    return true
  }

  async refreshLiveVideos(): Promise<boolean> {
    this.reportError(new Error('one video failed'), { videoId: 'v1' })

    return false
  }

  refreshRecentVideos(): Promise<boolean> {
    return Promise.resolve(false)
  }

  removeUnavailableVideos(): Promise<boolean> {
    return Promise.resolve(false)
  }

  syncAccounts(): Promise<boolean> {
    return Promise.resolve(false)
  }
}

describe('Scraper', () => {
  it('hands crawl operations what they need for a run', async () => {
    const now = Temporal.Instant.from('2024-05-01T12:00:00Z')
    const scraper = new ExampleScraper()

    await scraper.addNewVideos(now)

    expect(scraper.context).toMatchObject({
      fetcher: 'fetcher',
      now,
      supabaseClient,
    })
  })

  it('uses the current time unless a run is given one', async () => {
    const scraper = new ExampleScraper()
    const before = Temporal.Now.instant()

    await scraper.addNewVideos()

    expect(
      Temporal.Instant.compare(scraper.context?.now ?? before, before),
    ).toBeGreaterThanOrEqual(0)
  })

  it('passes failures that do not stop a run to onError', async () => {
    const onError = vi.fn()
    const scraper = new ExampleScraper({ onError })

    await scraper.refreshLiveVideos()

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'one video failed' }),
      { videoId: 'v1' },
    )
  })

  it('logs such failures when no onError is given', async () => {
    const logger = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }
    const scraper = new ExampleScraper({ logger })

    await scraper.refreshLiveVideos()

    expect(logger.error).toHaveBeenCalledWith('Failed to process an item', {
      error: expect.objectContaining({ message: 'one video failed' }),
      provider: 'example',
      videoId: 'v1',
    })
  })

  it('works without a logger', async () => {
    const scraper = new ExampleScraper()

    await expect(scraper.refreshLiveVideos()).resolves.toBe(false)
  })
})
