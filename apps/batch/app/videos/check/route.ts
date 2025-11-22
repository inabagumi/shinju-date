import * as Sentry from '@sentry/nextjs'
import { REDIS_KEYS } from '@shinju-date/constants'
import type { default as Database } from '@shinju-date/database'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { YouTubeScraper } from '@shinju-date/youtube-scraper'
import { after, type NextRequest } from 'next/server'
import { Temporal } from 'temporal-polyfill'
import { z } from 'zod'
import {
  batchUpdateVideos,
  processDeletedVideos,
  processScrapedVideoAvailability,
  processScrapedVideoForCheck,
  type VideoUpdate,
} from '@/lib/database'
import {
  videosCheckAll as ratelimitAll,
  videosCheck as ratelimitDefault,
  videosCheckRecent as ratelimitRecent,
} from '@/lib/ratelimit'
import { redisClient } from '@/lib/redis'
import { supabaseClient, type TypedSupabaseClient } from '@/lib/supabase'
import { youtubeClient } from '@/lib/youtube'

type CheckMode = 'default' | 'recent' | 'all'

const querySchema = z.object({
  mode: z.enum(['recent', 'all']).optional(),
})

function getMonitorSlug({ mode }: { mode: CheckMode }) {
  if (mode === 'all') {
    return '/videos/check?mode=all'
  }
  if (mode === 'recent') {
    return '/videos/check?mode=recent'
  }
  return '/videos/check'
}

export const maxDuration = 120

type Thumbnail = {
  id: string
}

type Video = {
  id: string
  duration: string
  published_at: string
  status: Database['public']['Enums']['video_status']
  title: string
  thumbnails: Thumbnail[] | Thumbnail | null
  youtube_video: {
    youtube_video_id: string
  }
}

type GetSavedVideos = {
  mode: CheckMode
  supabaseClient: TypedSupabaseClient
}

async function* getSavedVideos({
  mode,
  supabaseClient,
}: GetSavedVideos): AsyncGenerator<Video, void, undefined> {
  // For 'all' mode, fetch all videos in batches
  // For 'recent' mode, fetch only the latest 100 videos
  // For 'default' mode (no parameter), fetch only UPCOMING/LIVE videos
  if (mode === 'all') {
    const { count, error } = await supabaseClient.from('videos').select('*', {
      count: 'exact',
      head: true,
    })

    if (error) {
      throw new TypeError(error.message, {
        cause: error,
      })
    }

    if (!count) return

    const limit = 2000
    for (let i = 0; i < count; i += limit) {
      const { data: savedVideos, error } = await supabaseClient
        .from('videos')
        .select(
          'id, duration, published_at, status, title, thumbnails (id), youtube_video:youtube_videos!inner (youtube_video_id)',
        )
        .is('deleted_at', null)
        .order('published_at', {
          ascending: false,
        })
        .range(i, i + (limit - 1))

      if (error) {
        throw new TypeError(error.message, {
          cause: error,
        })
      }

      yield* savedVideos
    }
  } else if (mode === 'recent') {
    // For 'recent' mode: fetch latest 100 videos
    const { data: savedVideos, error } = await supabaseClient
      .from('videos')
      .select(
        'id, duration, published_at, status, title, thumbnails (id), youtube_video:youtube_videos!inner (youtube_video_id)',
      )
      .is('deleted_at', null)
      .order('published_at', {
        ascending: false,
      })
      .limit(100)

    if (error) {
      throw new TypeError(error.message, {
        cause: error,
      })
    }

    yield* savedVideos
  } else {
    // For 'default' mode: fetch only UPCOMING/LIVE videos
    const { data: savedVideos, error } = await supabaseClient
      .from('videos')
      .select(
        'id, duration, published_at, status, title, thumbnails (id), youtube_video:youtube_videos!inner (youtube_video_id)',
      )
      .is('deleted_at', null)
      .in('status', ['UPCOMING', 'LIVE'])
      .order('published_at', {
        ascending: false,
      })

    if (error) {
      throw new TypeError(error.message, {
        cause: error,
      })
    }

    yield* savedVideos
  }
}

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

  let updatedCount = 0
  const availableVideoIds = new Set<string>()
  const videoUpdates: VideoUpdate[] = []

  // For 'default' and 'recent' modes, fetch full video details and update information
  // For 'all' mode, only check availability (no updates)
  if (mode === 'default' || mode === 'recent') {
    // Use database function directly as callback
    await scraper.scrapeVideos({ ids: videoIds }, async (originalVideo) => {
      await processScrapedVideoForCheck({
        availableVideoIds,
        currentDateTime,
        originalVideo,
        savedVideos,
        videoUpdates,
      })
    })

    // Perform batch update if there are changes
    if (videoUpdates.length > 0) {
      updatedCount = await batchUpdateVideos({
        supabaseClient,
        updates: videoUpdates,
      })

      logger.info('動画が更新されました。', {
        count: updatedCount,
        mode,
      })
    }
  } else {
    // For 'all' mode, only check availability (no updates)
    await scraper.scrapeVideosAvailability({ videoIds }, async (video) => {
      await processScrapedVideoAvailability({
        availableVideoIds,
        video,
      })
    })
  }

  // Process deleted videos
  const { deletedCount, deletedVideoIds, errors } = await processDeletedVideos({
    availableVideoIds,
    currentDateTime,
    savedVideos,
    supabaseClient,
  })

  if (errors && errors.length > 0) {
    for (const error of errors) {
      Sentry.captureException(error)
    }
  }

  if (deletedCount > 0) {
    logger.info('動画が削除されました。', {
      count: deletedCount,
      ids: deletedVideoIds,
    })
  } else {
    logger.info('削除対象の動画は存在しませんでした。')
  }

  // Revalidate tags if any changes were made
  const hasChanges = updatedCount > 0 || deletedCount > 0
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
