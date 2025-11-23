import * as Sentry from '@sentry/nextjs'
import { REDIS_KEYS } from '@shinju-date/constants'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { YouTubeScraper, type YouTubeVideo } from '@shinju-date/youtube-scraper'
import { after, type NextRequest } from 'next/server'
import { Temporal } from 'temporal-polyfill'
import { processScrapedVideoAvailability } from '@/lib/database'
import {
  videosCheckAll as ratelimitAll,
  videosCheck as ratelimitDefault,
  videosCheckRecent as ratelimitRecent,
} from '@/lib/ratelimit'
import { redisClient } from '@/lib/redis'
import { supabaseClient } from '@/lib/supabase'
import { youtubeClient } from '@/lib/youtube'
import { getMonitorSlug } from './_lib/get-monitor-slug'
import { getSavedVideos } from './_lib/get-saved-videos'
import { processScrapedVideoForCheck } from './_lib/process-scraped-video-for-check'
import { querySchema } from './_lib/query-schema'
import type { CheckMode } from './_lib/types'

export const maxDuration = 120

export async function POST(request: NextRequest): Promise<Response> {
  const cronSecure = process.env['CRON_SECRET']
  if (
    cronSecure &&
    !verifyCronRequest(request, {
      cronSecure,
    })
  ) {
    Sentry.logger.warn('CRON_SECRET did not match.')

    return createErrorResponse('Unauthorized', {
      status: 401,
    })
  }

  const { searchParams } = request.nextUrl

  // Validate query parameters using zod
  const validationResult = querySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  )
  if (!validationResult.success) {
    return createErrorResponse('Invalid query parameters', {
      status: 400,
    })
  }

  const { mode: modeParam } = validationResult.data

  // Parse mode parameter
  // - No parameter (default): UPCOMING/LIVE videos only
  // - mode=recent: Latest 100 videos
  // - mode=all: All videos (deletion check only, no updates)
  let mode: CheckMode
  if (modeParam === 'all') {
    mode = 'all'
  } else if (modeParam === 'recent') {
    mode = 'recent'
  } else {
    mode = 'default'
  }

  // Use appropriate ratelimit based on mode
  const ratelimit =
    mode === 'all'
      ? ratelimitAll
      : mode === 'recent'
        ? ratelimitRecent
        : ratelimitDefault
  const { success } = await ratelimit.limit(
    mode === 'all'
      ? 'videos:check:all'
      : mode === 'recent'
        ? 'videos:check:recent'
        : 'videos:check',
  )

  if (!success) {
    logger.warn('There has been no interval since the last run.')

    return createErrorResponse(
      'There has been no interval since the last run.',
      {
        status: 429,
      },
    )
  }

  const monitorSlug = getMonitorSlug({
    mode,
  })
  const checkInId = Sentry.captureCheckIn(
    {
      monitorSlug,
      status: 'in_progress',
    },
    {
      schedule: {
        type: 'crontab',
        value:
          mode === 'all'
            ? '4 23 * * 2'
            : mode === 'recent'
              ? '*/30 * * * *'
              : '*/1 * * * *',
      },
      timezone: 'Etc/UTC',
    },
  )

  const currentDateTime = Temporal.Now.instant()
  const savedVideos = await Array.fromAsync(
    getSavedVideos({
      mode,
      supabaseClient,
    }),
  )

  const videoIds = savedVideos
    .map((savedVideo) => savedVideo.youtube_video?.youtube_video_id)
    .filter((id): id is string => Boolean(id))

  await using scraper = new YouTubeScraper({
    youtubeClient,
  })

  let hasChanges = false

  // For 'default' and 'recent' modes, fetch full video details and update information
  // For 'all' mode, only check availability and delete unavailable videos
  if (mode === 'default' || mode === 'recent') {
    // Collect all videos from YouTube API first, then process them all at once
    const allVideos: YouTubeVideo[] = []

    await scraper.scrapeVideos({ ids: videoIds }, async (originalVideos) => {
      allVideos.push(...originalVideos)
    })

    // Process all videos at once (updates and deletions)
    if (allVideos.length > 0) {
      hasChanges = await processScrapedVideoForCheck({
        currentDateTime,
        logger,
        mode,
        originalVideos: allVideos,
        savedVideos,
        supabaseClient,
      })
    }
  } else {
    // For 'all' mode, only check availability and delete unavailable videos
    await scraper.scrapeVideosAvailability({ videoIds }, async (videos) => {
      try {
        await processScrapedVideoAvailability({
          currentDateTime,
          logger,
          savedVideos,
          supabaseClient,
          videos,
        })
        hasChanges = true // Any deletion is a change
      } catch (error) {
        Sentry.captureException(error)
      }
    })
  }

  // Revalidate tags only if changes occurred
  if (hasChanges) {
    await revalidateTags(['videos'], {
      signal: request.signal,
    })
  }

  // Update last sync timestamp in Redis
  await redisClient.set(REDIS_KEYS.LAST_VIDEO_SYNC, toDBString(currentDateTime))

  after(async () => {
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug,
      status: 'ok',
    })

    await Sentry.flush(10_000)
  })

  return new Response(null, {
    status: 204,
  })
}

export const GET = POST
