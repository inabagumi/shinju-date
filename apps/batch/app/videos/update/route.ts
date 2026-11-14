import { createErrorResponse } from '@shinju-date/helpers'
import type { NextRequest } from 'next/server'
import { Temporal } from 'temporal-polyfill'
import { getVideosUpdateJob } from '@/lib/crawler-jobs'
import { runCronJob } from '@/lib/cron'
import { parseProvider } from '@/lib/provider'
import { createScraper } from '@/lib/scraper'
import { finishVideoSync } from '@/lib/video-sync'

export const maxDuration = 120

export async function POST(request: NextRequest): Promise<Response> {
  const providerResult = parseProvider(
    request.nextUrl.searchParams.get('provider'),
  )

  if (!providerResult.success) {
    return createErrorResponse(providerResult.error, { status: 400 })
  }

  const { provider } = providerResult

  return runCronJob(request, getVideosUpdateJob(provider), async () => {
    const now = Temporal.Now.instant()
    const changed = await createScraper(provider).addNewVideos(now)

    await finishVideoSync({ changed, now, signal: request.signal })
  })
}

export const GET = POST
