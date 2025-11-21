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
  videosCheckAll as ratelimitAll,
  videosCheck as ratelimitDefault,
  videosCheckRecent as ratelimitRecent,
} from '@/lib/ratelimit'
import { redisClient } from '@/lib/redis'
import { supabaseClient, type TypedSupabaseClient } from '@/lib/supabase'
import {
  batchUpdateVideos,
  getVideoUpdateIfNeeded,
  type VideoUpdate,
  type YouTubeVideoData,
} from '@/lib/thumbnails'
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

type SoftDeleteRowsOptions = {
  currentDateTime: Temporal.Instant
  ids: string[]
  supabaseClient: TypedSupabaseClient
  table: Exclude<
    keyof Database['public']['Tables'],
    'twitch_users' | 'twitch_videos' | 'youtube_channels' | 'youtube_videos'
  >
}

async function softDeleteRows({
  currentDateTime,
  ids,
  supabaseClient,
  table,
}: SoftDeleteRowsOptions): Promise<
  {
    id: string
  }[]
> {
  const { data, error } = await supabaseClient
    .from(table)
    .update({
      deleted_at: toDBString(currentDateTime),
      updated_at: toDBString(currentDateTime),
    })
    .in('id', ids)
    .select('id')

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return data
}

type DeleteOptions = {
  currentDateTime: Temporal.Instant
  supabaseClient: TypedSupabaseClient
  videos: Video[]
}

function deleteVideos({
  currentDateTime,
  supabaseClient,
  videos,
}: DeleteOptions): Promise<
  PromiseSettledResult<
    {
      id: string
    }[]
  >[]
> {
  const thumbnails = videos
    .map((video) =>
      Array.isArray(video.thumbnails) ? video.thumbnails[0] : video.thumbnails,
    )
    .filter(Boolean) as Thumbnail[]

  return Promise.allSettled([
    softDeleteRows({
      currentDateTime,
      ids: videos.map((video) => video.id),
      supabaseClient,
      table: 'videos',
    }),
    softDeleteRows({
      currentDateTime,
      ids: thumbnails.map((thumbnail) => thumbnail.id),
      supabaseClient,
      table: 'thumbnails',
    }),
  ])
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
    // Collect video updates in the callback
    for await (const _ of scraper.getVideos(
      { ids: videoIds },
      async (originalVideo) => {
        availableVideoIds.add(originalVideo.id)

        // Find corresponding saved video
        const savedVideo = savedVideos.find(
          (v) => v.youtube_video?.youtube_video_id === originalVideo.id,
        )

        if (!savedVideo) {
          return
        }

        // Convert YouTubeVideo to YouTubeVideoData format
        const videoData: YouTubeVideoData = {
          id: originalVideo.id,
        }

        if (originalVideo.contentDetails.duration) {
          videoData.contentDetails = {
            duration: originalVideo.contentDetails.duration,
          }
        }

        if (originalVideo.snippet.title || originalVideo.snippet.publishedAt) {
          videoData.snippet = {
            ...(originalVideo.snippet.title && {
              title: originalVideo.snippet.title,
            }),
            publishedAt: originalVideo.snippet.publishedAt,
          }
        }

        if (originalVideo.liveStreamingDetails) {
          videoData.liveStreamingDetails = {}
          if (originalVideo.liveStreamingDetails.scheduledStartTime) {
            videoData.liveStreamingDetails.scheduledStartTime =
              originalVideo.liveStreamingDetails.scheduledStartTime
          }
          if (originalVideo.liveStreamingDetails.actualStartTime) {
            videoData.liveStreamingDetails.actualStartTime =
              originalVideo.liveStreamingDetails.actualStartTime
          }
          if (originalVideo.liveStreamingDetails.actualEndTime) {
            videoData.liveStreamingDetails.actualEndTime =
              originalVideo.liveStreamingDetails.actualEndTime
          }
        }

        // Check if video needs updating and collect update data
        const updateData = getVideoUpdateIfNeeded({
          currentDateTime,
          originalVideo: videoData,
          savedVideo,
        })

        if (updateData) {
          videoUpdates.push(updateData)
        }
      },
    )) {
      // Consume the iterator
    }

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
    await scraper.checkVideos({ videoIds }, async (video) => {
      if (video.isAvailable) {
        availableVideoIds.add(video.id)
      }
    })
  }

  const deletedVideos = savedVideos.filter(
    (savedVideo) =>
      savedVideo.youtube_video?.youtube_video_id &&
      !availableVideoIds.has(savedVideo.youtube_video.youtube_video_id),
  )

  let deletedCount = 0
  if (deletedVideos.length > 0) {
    const results = await deleteVideos({
      currentDateTime,
      supabaseClient,
      videos: deletedVideos,
    })
    const rejectedResults = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )

    for (const result of rejectedResults) {
      Sentry.captureException(result.reason)
    }

    deletedCount = deletedVideos.length - rejectedResults.length
    logger.info('動画が削除されました。', {
      count: deletedCount,
      ids: deletedVideos
        .map((video) => video.youtube_video?.youtube_video_id)
        .filter(Boolean),
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
