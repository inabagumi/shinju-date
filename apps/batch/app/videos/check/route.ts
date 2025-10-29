import * as Sentry from '@sentry/nextjs'
import { REDIS_KEYS } from '@shinju-date/constants'
import type { default as Database } from '@shinju-date/database'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { YouTubeScraper } from '@shinju-date/youtube-scraper'
import { after, type NextRequest } from 'next/server'
import { Temporal } from 'temporal-polyfill'
import {
  videosCheckAll as ratelimitAll,
  videosCheck as ratelimitRecent,
} from '@/lib/ratelimit'
import { redisClient } from '@/lib/redis'
import { revalidateTags } from '@/lib/revalidate'
import { supabaseClient, type TypedSupabaseClient } from '@/lib/supabase'
import { youtubeClient } from '@/lib/youtube'

function getMonitorSlug({ all }: { all?: boolean | undefined }) {
  return all ? '/videos/check?all=1' : '/videos/check'
}

export const maxDuration = 120

type Thumbnail = {
  id: string
}

type Video = {
  id: string
  slug: string
  thumbnails: Thumbnail[] | Thumbnail | null
}

type GetSavedVideos = {
  all?: boolean
  supabaseClient: TypedSupabaseClient
}

async function* getSavedVideos({
  all = false,
  supabaseClient,
}: GetSavedVideos): AsyncGenerator<Video, void, undefined> {
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

  const limit = all ? 2000 : 100
  for (let i = 0; i < count; i += limit) {
    const { data: savedVideos, error } = await supabaseClient
      .from('videos')
      .select('id, slug, thumbnails (id)')
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

    if (!all) {
      break
    }
  }
}

type SoftDeleteRowsOptions = {
  currentDateTime: Temporal.Instant
  ids: string[]
  supabaseClient: TypedSupabaseClient
  table: keyof Database['public']['Tables']
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
      deleted_at: currentDateTime.toJSON(),
      updated_at: currentDateTime.toJSON(),
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
  const all =
    searchParams.has('all') &&
    ['1', 'true', 'yes'].includes(searchParams.get('all') ?? 'false')
  const ratelimit = all ? ratelimitAll : ratelimitRecent
  const { success } = await ratelimit.limit(
    all ? 'videos:check:all' : 'videos:check',
  )

  if (!success) {
    Sentry.logger.warn('There has been no interval since the last run.')

    return createErrorResponse(
      'There has been no interval since the last run.',
      {
        status: 429,
      },
    )
  }

  const monitorSlug = getMonitorSlug({
    all,
  })
  const checkInId = Sentry.captureCheckIn(
    {
      monitorSlug,
      status: 'in_progress',
    },
    {
      schedule: {
        type: 'crontab',
        value: all ? '4 23 * * 2' : '27/30 * * * *',
      },
      timezone: 'Etc/UTC',
    },
  )

  const currentDateTime = Temporal.Now.instant()
  const savedVideos = await Array.fromAsync(
    getSavedVideos({
      all,
      supabaseClient,
    }),
  )

  const videoIds = savedVideos.map((savedVideo) => savedVideo.slug)
  const availableVideoIds = new Set<string>()

  await using scraper = new YouTubeScraper({
    youtubeClient,
  })

  await scraper.checkVideos({
    onVideoChecked: async (video) => {
      if (video.isAvailable) {
        availableVideoIds.add(video.id)
      }
    },
    videoIds,
  })

  const deletedVideos = savedVideos.filter(
    (savedVideo) => !availableVideoIds.has(savedVideo.slug),
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
      ids: deletedVideos.map((video) => video.slug),
    })

    await revalidateTags(['videos'], {
      signal: request.signal,
    })
  } else {
    Sentry.logger.info('Deleted videos did not exist.')
  }

  // Update last sync timestamp in Redis
  await redisClient.set(REDIS_KEYS.LAST_VIDEO_SYNC, currentDateTime.toString())

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
