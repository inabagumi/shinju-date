import { runCronJob } from '@/lib/cron'
import { IMAGES_CLEANUP_JOB } from '@/lib/jobs'
import { createScraper } from '@/lib/scraper'

export const maxDuration = 60

export async function POST(request: Request): Promise<Response> {
  return runCronJob(request, IMAGES_CLEANUP_JOB, async () => {
    // Images are shared by every platform, so the scraper of any platform
    // cleans up all of them. A failure is reported to Sentry by the scraper
    // (`onError`) and does not fail the run.
    await createScraper('youtube').cleanUpImages()
  })
}

export const GET = POST
