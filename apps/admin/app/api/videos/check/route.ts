import { Temporal } from '@js-temporal/polyfill'
import { type Database } from '@shinju-date/schema'
import { type NextRequest, NextResponse } from 'next/server'
import { createAlgoliaClient } from '@/lib/algolia'
import { isDuplicate } from '@/lib/redis'
import { createErrorResponse } from '@/lib/session'
import { type TypedSupabaseClient, createSupabaseClient } from '@/lib/supabase'
import { youtubeClient } from '@/lib/youtube'

const CHECK_DUPLICATE_KEY = 'cron:videos:check'
const CHECK_DURATION = Temporal.Duration.from({ minutes: 25 })

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
  table: keyof Database['public']['Tables']
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

async function deleteVideos({
  currentDateTime,
  supabaseClient,
  videos
}: DeleteOptions): Promise<void> {
  const thumbnails = videos
    .map((video) =>
      Array.isArray(video.thumbnails) ? video.thumbnails[0] : video.thumbnails
    )
    .filter(Boolean) as Thumbnail[]

  await Promise.all([
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

  const algoliaClient = createAlgoliaClient({
    apiKey: process.env.ALGOLIA_ADMIN_API_KEY
  })

  await algoliaClient.deleteObjects(videos.map((video) => video.slug))

  console.log(videos)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl
  const all =
    searchParams.has('all') &&
    ['1', 'true', 'yes'].includes(searchParams.get('all') ?? 'false')
  const duration = all ? Temporal.Duration.from({ days: 4 }) : CHECK_DURATION
  const duplicateKey = all ? `${CHECK_DUPLICATE_KEY}:all` : CHECK_DUPLICATE_KEY

  if (await isDuplicate(duplicateKey, duration)) {
    return createErrorResponse(
      429,
      'There has been no interval since the last run.'
    )
  }

  const currentDateTime = Temporal.Now.instant()
  const supabaseClient = createSupabaseClient({
    token: process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  const savedVideos: Video[] = []

  try {
    for await (const savedVideo of getSavedVideos({ all, supabaseClient })) {
      savedVideos.push(savedVideo)
    }
  } catch (error) {
    console.error(error)

    return createErrorResponse(500, 'internal server error')
  }

  const videoIDs: string[] = []

  try {
    for await (const videoID of getVideoIDs(
      savedVideos.map((savedVideo) => savedVideo.slug)
    )) {
      videoIDs.push(videoID)
    }
  } catch (error) {
    console.error(error)

    return createErrorResponse(500, 'internal server error')
  }

  if (savedVideos.length !== videoIDs.length) {
    const deletedVideos = savedVideos.filter(
      (savedVideo) => !videoIDs.includes(savedVideo.slug)
    )

    if (deletedVideos.length > 0) {
      await deleteVideos({
        currentDateTime,
        supabaseClient,
        videos: deletedVideos
      })
    }
  }

  return new NextResponse(null, {
    status: 204
  })
}

export const GET = POST
