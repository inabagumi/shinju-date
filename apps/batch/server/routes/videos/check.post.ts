import * as Sentry from '@sentry/node'
import { REDIS_KEYS } from '@shinju-date/constants'
import type { default as Database, TablesInsert } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import type { YouTubeVideo } from '@shinju-date/youtube-scraper'
import {
  getPublishedAt,
  getVideoStatus,
  YouTubeScraper,
} from '@shinju-date/youtube-scraper'
import { Temporal } from 'temporal-polyfill'

type CheckMode = 'recent' | 'all'

function getMonitorSlug({ mode }: { mode: CheckMode }) {
  return mode === 'all' ? '/videos/check?mode=all' : '/videos/check'
}

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
  // For 'recent' mode, fetch only the latest 100 videos or UPCOMING/LIVE videos
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

      for (const savedVideo of savedVideos) {
        yield savedVideo
      }
    }
  } else {
    // For 'recent' mode: fetch UPCOMING/LIVE videos or latest 100
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

    for (const savedVideo of savedVideos) {
      yield savedVideo
    }
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

type UpdateVideosOptions = {
  currentDateTime: Temporal.Instant
  originalVideos: YouTubeVideo[]
  savedVideos: Video[]
  supabaseClient: TypedSupabaseClient
}

async function updateVideos({
  currentDateTime,
  originalVideos,
  savedVideos,
  supabaseClient,
}: UpdateVideosOptions): Promise<number> {
  const videosToUpdate: TablesInsert<'videos'>[] = []

  for (const originalVideo of originalVideos) {
    const savedVideo = savedVideos.find(
      (v) => v.youtube_video?.youtube_video_id === originalVideo.id,
    )

    if (!savedVideo) {
      continue
    }

    const updateValue: Partial<TablesInsert<'videos'>> = {}
    let hasUpdate = false

    // Check status
    const newStatus = getVideoStatus(originalVideo, currentDateTime)
    if (savedVideo.status !== newStatus) {
      updateValue.status = newStatus
      hasUpdate = true
    }

    // Check duration
    const newDuration = originalVideo.contentDetails?.duration ?? 'P0D'
    if (savedVideo.duration !== newDuration) {
      updateValue.duration = newDuration
      hasUpdate = true
    }

    // Check published_at
    const newPublishedAt = getPublishedAt(originalVideo)
    if (newPublishedAt) {
      const savedPublishedAt = Temporal.Instant.from(savedVideo.published_at)
      if (!savedPublishedAt.equals(newPublishedAt)) {
        updateValue.published_at = toDBString(newPublishedAt)
        hasUpdate = true
      }
    }

    // Check title
    const newTitle = originalVideo.snippet?.title ?? ''
    if (savedVideo.title !== newTitle) {
      updateValue.title = newTitle
      hasUpdate = true
    }

    if (hasUpdate) {
      videosToUpdate.push({
        duration: updateValue.duration ?? savedVideo.duration,
        id: savedVideo.id,
        published_at: updateValue.published_at ?? savedVideo.published_at,
        status: updateValue.status ?? savedVideo.status,
        title: updateValue.title ?? savedVideo.title,
        updated_at: toDBString(currentDateTime),
      } as TablesInsert<'videos'>)
    }
  }

  if (videosToUpdate.length === 0) {
    return 0
  }

  // Batch update videos
  const { error } = await supabaseClient.from('videos').upsert(videosToUpdate, {
    onConflict: 'id',
  })

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return videosToUpdate.length
}

export default defineEventHandler(async (event) => {
  // Verify cron authentication
  verifyCronAuth(event)

  const query = getQuery(event)

  // Parse mode parameter, default to 'recent'
  const modeParam = String(query.mode ?? 'recent').toLowerCase()
  const mode: CheckMode = modeParam === 'all' ? 'all' : 'recent'

  const ratelimit = mode === 'all' ? videosCheckAll : videosCheck
  const { success } = await ratelimit.limit(
    mode === 'all' ? 'videos:check:all' : 'videos:check',
  )

  if (!success) {
    Sentry.logger.warn('There has been no interval since the last run.')

    throw createError({
      message: 'There has been no interval since the last run.',
      statusCode: 429,
    })
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
        value: mode === 'all' ? '4 23 * * 2' : '27/30 * * * *',
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

  // For 'recent' mode, fetch full video details and update information
  if (mode === 'recent') {
    const originalVideos = await Array.fromAsync(
      scraper.getVideos({
        ids: videoIds,
        onVideoScraped: async (video) => {
          availableVideoIds.add(video.id)
        },
      }),
    )

    updatedCount = await updateVideos({
      currentDateTime,
      originalVideos,
      savedVideos,
      supabaseClient,
    })

    if (updatedCount > 0) {
      Sentry.logger.info('Videos have been updated.', {
        count: updatedCount,
      })
      // Revalidate tags for updated videos
      await revalidateTags(['videos'])
    }
  } else {
    // For 'all' mode, only check availability (no updates)
    await scraper.checkVideos({
      onVideoChecked: async (video) => {
        if (video.isAvailable) {
          availableVideoIds.add(video.id)
        }
      },
      videoIds,
    })
  }

  const deletedVideos = savedVideos.filter(
    (savedVideo) =>
      savedVideo.youtube_video?.youtube_video_id &&
      !availableVideoIds.has(savedVideo.youtube_video.youtube_video_id),
  )

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

    Sentry.logger.info('The videos has been deleted.', {
      ids: deletedVideos
        .map((video) => video.youtube_video?.youtube_video_id)
        .filter(Boolean),
    })

    // Note: In Nitro, we don't have request.signal, so we omit it
    await revalidateTags(['videos'])
  } else {
    Sentry.logger.info('Deleted videos did not exist.')
  }

  // Update last sync timestamp in Redis
  await redisClient.set(REDIS_KEYS.LAST_VIDEO_SYNC, toDBString(currentDateTime))

  afterResponse(event, async () => {
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug,
      status: 'ok',
    })

    await Sentry.flush(10_000)
  })

  setResponseStatus(event, 204)
  return null
})
