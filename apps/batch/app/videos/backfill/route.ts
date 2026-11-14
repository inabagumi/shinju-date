import type { Scraper } from '@shinju-date/scraper'
import {
  type BackfillProvider,
  BackfillQueue,
} from '@shinju-date/video-backfill'
import { revalidateTags } from '@shinju-date/web-cache'
import type { NextRequest } from 'next/server'
import { VIDEOS_BACKFILL_JOB } from '@/lib/crawler-jobs'
import { runCronJob } from '@/lib/cron'
import { redisClient } from '@/lib/redis'
import { createScraper } from '@/lib/scraper'
import { supabaseClient } from '@/lib/supabase'
import { workOffBackfillQueue } from '@/lib/video-backfill'
import { recordBackfillJob } from '@/lib/video-backfill-history'

export const maxDuration = 120

/**
 * How long a run starts new pages. Shorter than the cron interval, so that
 * at most two runs overlap, and well within `maxDuration`, so that the page
 * in progress when it runs out can still finish.
 */
const TIME_BUDGET = Temporal.Duration.from({ seconds: 50 })

export async function POST(request: NextRequest): Promise<Response> {
  return runCronJob(request, VIDEOS_BACKFILL_JOB, async () => {
    const deadline = Temporal.Now.instant().add(TIME_BUDGET)
    const scrapers = new Map<BackfillProvider, Scraper>()
    const { added } = await workOffBackfillQueue({
      deadline,
      getScraper: (provider) => {
        let scraper = scrapers.get(provider)

        if (!scraper) {
          scraper = createScraper(provider)
          scrapers.set(provider, scraper)
        }

        return scraper
      },
      // Jobs expire in Redis; the history keeps what they did.
      onFinish: (job) => recordBackfillJob(supabaseClient, job),
      queue: new BackfillQueue(redisClient),
    })

    if (added > 0) {
      await revalidateTags(['videos'], { signal: request.signal })
    }
  })
}

export const GET = POST
