import type { Scraper } from '@shinju-date/scraper'
import type { NextRequest } from 'next/server'
import { runCronJob } from '@/lib/cron'
import { getVideosCheckJob, type VideosCheckMode } from '@/lib/jobs'
import { parseQuery } from '@/lib/query'
import { createScraper } from '@/lib/scraper'
import { finishVideoSync } from '@/lib/video-sync'
import { querySchema } from './_lib/query-schema'

export const maxDuration = 120

/**
 * - `default`: videos that are scheduled or on air
 * - `recent`: the newest finished videos
 * - `all`: availability of every video
 */
function checkVideos(
  scraper: Scraper,
  mode: VideosCheckMode,
  now: Temporal.Instant,
): Promise<boolean> {
  switch (mode) {
    case 'all':
      return scraper.removeUnavailableVideos(now)
    case 'recent':
      return scraper.refreshRecentVideos(now)
    default:
      return scraper.refreshLiveVideos(now)
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const query = parseQuery(querySchema, request)

  if (query instanceof Response) {
    return query
  }

  const { mode = 'default', provider } = query

  return runCronJob(request, getVideosCheckJob(provider, mode), async () => {
    const now = Temporal.Now.instant()
    const changed = await checkVideos(createScraper(provider), mode, now)

    await finishVideoSync({ changed, now, signal: request.signal })
  })
}

export const GET = POST
