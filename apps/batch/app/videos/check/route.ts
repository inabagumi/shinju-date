import * as Sentry from '@sentry/nextjs'
import { REDIS_KEYS } from '@shinju-date/constants'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import type { TwitchClip, TwitchVideo } from '@shinju-date/twitch-scraper'
import { TwitchScraper } from '@shinju-date/twitch-scraper'
import { revalidateTags } from '@shinju-date/web-cache'
import { YouTubeScraper } from '@shinju-date/youtube-scraper'
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
import { getSavedTwitchVideos } from './_lib/get-saved-twitch-videos'
import { getSavedVideos } from './_lib/get-saved-videos'
import { processScrapedVideoForCheck } from './_lib/process-scraped-video-for-check'
import {
  processTwitchAvailability,
  processTwitchVideosForCheck,
} from './_lib/process-twitch-videos-for-check'
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

  const validationResult = querySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  )
  if (!validationResult.success) {
    return createErrorResponse('Invalid query parameters', {
      status: 400,
    })
  }

  const { mode: modeParam, provider } = validationResult.data

  let mode: CheckMode
  if (modeParam === 'all') {
    mode = 'all'
  } else if (modeParam === 'recent') {
    mode = 'recent'
  } else {
    mode = 'default'
  }

  // Twitch has no UPCOMING/LIVE pipeline; default mode is YouTube-only.
  if (provider === 'twitch' && mode === 'default') {
    return createErrorResponse(
      'Twitch provider requires mode=recent or mode=all.',
      {
        status: 400,
      },
    )
  }

  const ratelimit =
    mode === 'all'
      ? ratelimitAll
      : mode === 'recent'
        ? ratelimitRecent
        : ratelimitDefault
  const { success } = await ratelimit.limit(
    mode === 'all'
      ? `videos:check:all:${provider}`
      : mode === 'recent'
        ? `videos:check:recent:${provider}`
        : `videos:check:${provider}`,
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
    provider,
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
            ? provider === 'twitch'
              ? '34 23 * * 2,4'
              : '4 23 * * 2'
            : mode === 'recent'
              ? provider === 'twitch'
                ? '15,45 * * * *'
                : '*/30 * * * *'
              : '*/1 * * * *',
      },
      timezone: 'Etc/UTC',
    },
  )

  const currentDateTime = Temporal.Now.instant()
  let hasChanges = false

  if (provider === 'youtube') {
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

    if (mode === 'default' || mode === 'recent') {
      if (videoIds.length > 0) {
        await scraper.scrapeVideos({ ids: videoIds }, async (allVideos) => {
          hasChanges = await processScrapedVideoForCheck({
            currentDateTime,
            logger,
            mode,
            originalVideos: allVideos,
            savedVideos,
            supabaseClient,
          })
        })
      }
    } else if (videoIds.length > 0) {
      await scraper.scrapeVideosAvailability({ videoIds }, async (videos) => {
        try {
          await processScrapedVideoAvailability({
            currentDateTime,
            logger,
            savedVideos,
            supabaseClient,
            videos,
          })
          hasChanges = true
        } catch (error) {
          Sentry.captureException(error)
        }
      })
    }
  } else {
    const savedTwitchVideos = await Array.fromAsync(
      getSavedTwitchVideos({
        mode,
        supabaseClient,
      }),
    )

    if (savedTwitchVideos.length > 0) {
      const nonClipIds: string[] = []
      const clipIds: string[] = []

      for (const video of savedTwitchVideos) {
        if (video.twitch_video.type === 'clip') {
          clipIds.push(video.twitch_video.twitch_video_id)
        } else {
          nonClipIds.push(video.twitch_video.twitch_video_id)
        }
      }

      await using scraper = new TwitchScraper({ concurrency: 2 })

      if (mode === 'recent') {
        const scrapedVideos: TwitchVideo[] = []
        const scrapedClips: TwitchClip[] = []

        await scraper.scrapeVideos({ ids: nonClipIds }, async (videos) => {
          scrapedVideos.push(...videos)
        })
        await scraper.scrapeClips({ ids: clipIds }, async (clips) => {
          scrapedClips.push(...clips)
        })

        hasChanges = await processTwitchVideosForCheck({
          clips: scrapedClips,
          currentDateTime,
          logger,
          mode,
          savedVideos: savedTwitchVideos,
          supabaseClient,
          videos: scrapedVideos,
        })
      } else {
        // mode=all: availability / soft-delete only (parity with YouTube)
        await scraper.scrapeVideosAvailability(
          { clipIds, videoIds: nonClipIds },
          async (results) => {
            try {
              const deleted = await processTwitchAvailability({
                currentDateTime,
                logger,
                results,
                savedVideos: savedTwitchVideos,
                supabaseClient,
              })
              hasChanges = hasChanges || deleted
            } catch (error) {
              Sentry.captureException(error)
            }
          },
        )
      }
    }
  }

  if (hasChanges) {
    await revalidateTags(['videos'], {
      signal: request.signal,
    })
  }

  // Shared across providers: admin "last video sync" is platform-agnostic.
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
