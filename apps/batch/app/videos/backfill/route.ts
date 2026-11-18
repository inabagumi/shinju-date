import { CACHE_TAGS } from '@shinju-date/constants'
import type { Scraper } from '@shinju-date/scraper'
import {
  type BackfillProvider,
  BackfillQueue,
  createBackfillRunResultRecorder,
} from '@shinju-date/video-backfill'
import { revalidateTags } from '@shinju-date/web-cache'
import type { NextRequest } from 'next/server'
import { runCronJob } from '@/lib/cron'
import { VIDEOS_BACKFILL_JOB } from '@/lib/jobs'
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
      // A job is locked for as long as this run may last, and a little more.
      // A job of a check keeps its outcome for the check when it finishes.
      queue: new BackfillQueue(redisClient, {
        maxRunSeconds: maxDuration,
        onFinish: createBackfillRunResultRecorder(redisClient),
      }),
    })

    if (added > 0) {
      await revalidateTags([CACHE_TAGS.VIDEOS], { signal: request.signal })
    }
  })
}

export const GET = POST
