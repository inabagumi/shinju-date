import * as Sentry from '@sentry/nextjs'
import { logger } from '@shinju-date/logger'
import type { Scraper, ScraperOptions } from '@shinju-date/scraper'
import { TwitchScraper } from '@shinju-date/scraper/twitch'
import { YouTubeScraper } from '@shinju-date/scraper/youtube'
import type { Provider } from './provider'
import { supabaseClient } from './supabase'

/**
 * Creates the scraper of a platform, wired to this app's database, logger
 * and error tracking.
 */
export function createScraper(provider: Provider): Scraper {
  const options: ScraperOptions = {
    logger,
    // Failures of single accounts or videos do not fail the run, so they are
    // reported here instead.
    onError: (error, context) => {
      Sentry.captureException(error, { extra: { ...context, provider } })
    },
    supabaseClient,
  }

  return provider === 'twitch'
    ? new TwitchScraper(options)
    : new YouTubeScraper(options)
}
