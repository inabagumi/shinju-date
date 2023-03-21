import { Temporal } from '@js-temporal/polyfill'
import { type NextRequest, NextResponse } from 'next/server'
import { createAlgoliaClient } from '@/lib/algolia'
import { isDuplicate } from '@/lib/redis'
import { createErrorResponse } from '@/lib/session'
import { type TypedSupabaseClient, createSupabaseClient } from '@/lib/supabase'
import { youtubeClient } from '@/lib/youtube'

const CHECK_DUPLICATE_KEY = 'cron:videos:check'

type Video = {
  id: number
  slug: string
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

  for (let i = 0; i < count; i += 100) {
    const { data: savedVideos, error } = await supabaseClient
      .from('videos')
      .select('id, slug')
      .is('deleted_at', null)
      .order('published_at', { ascending: false })
      .range(i, i + 99)

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
  const { error } = await supabaseClient
    .from('videos')
    .update({
      deleted_at: currentDateTime.toJSON()
    })
    .in(
      'id',
      videos.map((video) => video.id)
    )

  if (error) {
    throw error
  }

  const algoliaClient = createAlgoliaClient({
    apiKey: process.env.ALGOLIA_ADMIN_API_KEY
  })

  await algoliaClient.deleteObjects(videos.map((video) => video.slug))

  console.log(videos)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const duration = Temporal.Duration.from({ minutes: 30 })

  if (await isDuplicate(CHECK_DUPLICATE_KEY, duration)) {
    return createErrorResponse(
      429,
      'There has been no interval since the last run.'
    )
  }

  const { searchParams } = request.nextUrl
  const all =
    searchParams.has('all') &&
    ['1', 'true', 'yes'].includes(searchParams.get('all') ?? 'false')
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
