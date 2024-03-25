import { Temporal } from '@js-temporal/polyfill'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import {
  type DefaultDatabase,
  createSupabaseClient
} from '@shinju-date/supabase'
import { type NextRequest } from 'next/server'
import { captureException, defaultLogger as logger } from '@/lib/logging'
import {
  videosCheckAll as ratelimitAll,
  videosCheck as ratelimitRecent
} from '@/lib/ratelimit'
import { youtubeClient } from '@/lib/youtube'

export const runtime = 'nodejs'
export const revalidate = 0
export const maxDuration = 120

type TypedSupabaseClient = ReturnType<typeof createSupabaseClient>

type Thumbnail = {
  id: number
}

type Video = {
  id: number
  slug: string
  thumbnails: Thumbnail[] | Thumbnail | null
}

type GetSavedVideos = {
  all?: boolean
  supabaseClient: TypedSupabaseClient
}

async function* getSavedVideos({
  all = false,
  supabaseClient
}: GetSavedVideos): AsyncGenerator<Video, void, undefined> {
  const { count, error } = await supabaseClient
    .from('videos')
    .select('*', { count: 'exact', head: true })

  if (error) {
    throw error
  }

  if (!count) return

  const limit = all ? 2000 : 100
  for (let i = 0; i < count; i += limit) {
    const { data: savedVideos, error } = await supabaseClient
      .from('videos')
      .select('id, slug, thumbnails (id)')
      .is('deleted_at', null)
      .order('published_at', { ascending: false })
      .range(i, i + (limit - 1))

    if (error) {
      throw error
    }

    for (const savedVideo of savedVideos) {
      yield savedVideo
    }

    if (!all) {
      break
    }
  }
}

async function* getVideoIDs(
  ids: string[]
): AsyncGenerator<string, void, undefined> {
  for (let i = 0; i < ids.length; i += 50) {
    const videoIDs = ids.slice(i, i + 50)

    const {
      data: { items }
    } = await youtubeClient.videos.list({
      id: videoIDs,
      maxResults: videoIDs.length,
      part: ['id']
    })

    if (!items || items.length < 1) {
      continue
    }

    for (const item of items) {
      if (!item.id) {
        continue
      }

      yield item.id
    }
  }
}

type SoftDeleteRowsOptions = {
  currentDateTime: Temporal.Instant
  ids: number[]
  supabaseClient: TypedSupabaseClient
  table: keyof DefaultDatabase['public']['Tables']
}

async function softDeleteRows({
  currentDateTime,
  ids,
  supabaseClient,
  table
}: SoftDeleteRowsOptions): Promise<{ id: number }[]> {
  const { data, error } = await supabaseClient
    .from(table)
    .update({
      deleted_at: currentDateTime.toJSON(),
      updated_at: currentDateTime.toJSON()
    })
    .in('id', ids)
    .select('id')

  if (error) {
    throw error
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
  videos
}: DeleteOptions): Promise<PromiseSettledResult<{ id: number }[]>[]> {
  const thumbnails = videos
    .map((video) =>
      Array.isArray(video.thumbnails) ? video.thumbnails[0] : video.thumbnails
    )
    .filter(Boolean) as Thumbnail[]

  return Promise.allSettled([
    softDeleteRows({
      currentDateTime,
      ids: videos.map((video) => video.id),
      supabaseClient,
      table: 'videos'
    }),
    softDeleteRows({
      currentDateTime,
      ids: thumbnails.map((thumbnail) => thumbnail.id),
      supabaseClient,
      table: 'thumbnails'
    })
  ])
}

export async function POST(request: NextRequest): Promise<Response> {
  const cronSecure = process.env['CRON_SECRET']
  if (cronSecure && !verifyCronRequest(request, { cronSecure })) {
    return createErrorResponse('Unauthorized', { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const all =
    searchParams.has('all') &&
    ['1', 'true', 'yes'].includes(searchParams.get('all') ?? 'false')
  const ratelimit = all ? ratelimitAll : ratelimitRecent
  const { success } = await ratelimit.limit(
    all ? 'videos:check:all' : 'videos:check'
  )

  if (!success) {
    return createErrorResponse(
      'There has been no interval since the last run.',
      { status: 429 }
    )
  }

  const currentDateTime = Temporal.Now.instant()
  const supabaseClient = createSupabaseClient(
    undefined,
    process.env['SUPABASE_SERVICE_ROLE_KEY']
  )

  const savedVideos: Video[] = []

  try {
    for await (const savedVideo of getSavedVideos({ all, supabaseClient })) {
      savedVideos.push(savedVideo)
    }
  } catch (error) {
    captureException(error)

    return createErrorResponse('internal server error', { status: 500 })
  }

  const videoIDs: string[] = []

  try {
    for await (const videoID of getVideoIDs(
      savedVideos.map((savedVideo) => savedVideo.slug)
    )) {
      videoIDs.push(videoID)
    }
  } catch (error) {
    captureException(error)

    return createErrorResponse('internal server error', { status: 500 })
  }

  if (savedVideos.length !== videoIDs.length) {
    const deletedVideos = savedVideos.filter(
      (savedVideo) => !videoIDs.includes(savedVideo.slug)
    )

    if (deletedVideos.length > 0) {
      const results = await deleteVideos({
        currentDateTime,
        supabaseClient,
        videos: deletedVideos
      })
      const rejectedResults = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected'
      )

      for (const result of rejectedResults) {
        captureException(result.reason)
      }

      logger.info('The videos has been deleted.', {
        ids: deletedVideos.map((video) => video.slug)
      })
    }
  }

  return new Response(null, {
    status: 204
  })
}

export const GET = POST
