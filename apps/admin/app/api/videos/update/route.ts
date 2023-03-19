import { youtube_v3 as youtube } from '@googleapis/youtube'
import { Temporal } from '@js-temporal/polyfill'
import { type Database } from '@shinju-date/schema'
import { NextResponse } from 'next/server'
import { isDuplicate } from '@/lib/redis'
import { createErrorResponse } from '@/lib/session'
import { type TypedSupabaseClient, createSupabaseClient } from '@/lib/supabase'
import { youtubeClient } from '@/lib/youtube'

type GetPlaylistItemsOptions = {
  all?: boolean
}

async function* getPlayListitems(
  playlistID: string,
  { all = false }: GetPlaylistItemsOptions = {}
): AsyncGenerator<youtube.Schema$PlaylistItem, void, undefined> {
  let pageToken: string | undefined

  while (true) {
    const {
      data: { items, nextPageToken }
    } = await youtubeClient.playlistItems.list({
      maxResults: 50,
      pageToken,
      part: ['contentDetails'],
      playlistId: playlistID
    })

    if (!items || items.length < 1) {
      break
    }

    for (const item of items) {
      if (item.contentDetails?.videoId) {
        yield item
      }
    }

    if (!all || !nextPageToken) {
      break
    }

    pageToken = nextPageToken
  }
}

function getPublishedAt(
  video: youtube.Schema$Video
): Temporal.Instant | undefined {
  const publishedAt = video.liveStreamingDetails
    ? video.liveStreamingDetails.actualStartTime ??
      video.liveStreamingDetails.scheduledStartTime
    : video.snippet?.publishedAt

  return publishedAt ? Temporal.Instant.from(publishedAt) : undefined
}

type GetVideosOptions = {
  all?: boolean
}

async function* getVideos(
  channelID: string,
  { all = false }: GetVideosOptions = {}
): AsyncGenerator<youtube.Schema$Video, void, undefined> {
  const playlistItems: youtube.Schema$PlaylistItem[] = []

  for await (const playlistItem of getPlayListitems(channelID, { all })) {
    playlistItems.push(playlistItem)
  }

  for (let i = 0; i < playlistItems.length; i += 50) {
    const ids = playlistItems
      .slice(i, i + 50)
      .map((playlistItem) => playlistItem.contentDetails?.videoId) as string[]

    const {
      data: { items }
    } = await youtubeClient.videos.list({
      id: ids,
      maxResults: ids.length,
      part: ['contentDetails', 'liveStreamingDetails', 'snippet']
    })

    if (!items || items.length < 1) {
      continue
    }

    for (const item of items) {
      const publishedAt = getPublishedAt(item)
      if (item.id && publishedAt) {
        yield item
      }
    }
  }
}

type Video = Pick<
  Database['public']['Tables']['videos']['Row'],
  'slug' | 'title' | 'url'
>

type SavedVideo = Pick<
  Database['public']['Tables']['videos']['Row'],
  'id' | 'duration' | 'published_at' | 'slug' | 'title'
>

type ScrapeOptions = {
  channelID: number
  currentDateTime: Temporal.Instant
  playlistID: string
  supabaseClient: TypedSupabaseClient
}

async function scrape({
  channelID,
  currentDateTime = Temporal.Now.instant(),
  playlistID,
  supabaseClient
}: ScrapeOptions): Promise<PromiseSettledResult<Video[]>[]> {
  const videos: youtube.Schema$Video[] = []
  for await (const video of getVideos(playlistID)) {
    videos.push(video)
  }

  const videoIDs = videos.map((video) => video.id).filter(Boolean) as string[]
  const savedVideos: SavedVideo[] = []

  for (let i = 0; i < videoIDs.length; i += 100) {
    const { data, error } = await supabaseClient
      .from('videos')
      .select('id, duration, published_at, slug, title')
      .in('slug', videoIDs.slice(i, i + 100))

    if (error) {
      throw error
    }

    savedVideos.push(...data)
  }

  const savedVideoIDs = savedVideos.map((savedVideo) => savedVideo.slug)
  const unsavedVideos = videos.filter(
    (video) => video.id && !savedVideoIDs.includes(video.id)
  )

  return Promise.allSettled([
    ...savedVideos.map(async (savedVideo) => {
      const newVideo = videos.find((video) => video.id === savedVideo.slug)

      if (!newVideo || !newVideo.snippet || !newVideo.contentDetails) {
        throw new TypeError('New video does not exist.')
      }

      const newPublishedAt = getPublishedAt(newVideo)

      if (!newPublishedAt) {
        throw new TypeError('Publication date time does not exist.')
      }

      const savedPublishedAt = Temporal.Instant.from(savedVideo.published_at)
      const newDuration = newVideo.contentDetails.duration ?? 'P0D'

      if (
        savedVideo.duration === newDuration &&
        savedPublishedAt.equals(newPublishedAt) &&
        savedVideo.title === newVideo.snippet.title
      ) {
        return []
      }

      const { data, error } = await supabaseClient
        .from('videos')
        .update({
          duration: newDuration,
          published_at: newPublishedAt.toJSON(),
          title: newVideo.snippet.title ?? '',
          updated_at: currentDateTime.toJSON()
        })
        .eq('id', savedVideo.id)
        .select('slug, title, url')
        .single()

      if (error) {
        throw error
      }

      return [data]
    }),
    (async function () {
      const values: Database['public']['Tables']['videos']['Insert'][] = []

      for (const unsavedVideo of unsavedVideos) {
        if (
          !unsavedVideo.id ||
          !unsavedVideo.snippet ||
          !unsavedVideo.contentDetails
        ) {
          continue
        }

        const publishedAt = getPublishedAt(unsavedVideo)

        if (!publishedAt) {
          continue
        }

        values.push({
          channel_id: channelID,
          created_at: currentDateTime.toJSON(),
          duration: unsavedVideo.contentDetails.duration ?? 'P0D',
          published_at: publishedAt.toJSON(),
          slug: unsavedVideo.id,
          title: unsavedVideo.snippet.title ?? '',
          updated_at: currentDateTime.toJSON(),
          url: `https://www.youtube.com/watch?v=${unsavedVideo.id}`
        })
      }

      const { data, error } = await supabaseClient
        .from('videos')
        .insert(values)
        .select('slug, title, url')

      if (error) {
        throw error
      }

      return data
    })()
  ])
}

export async function POST(): Promise<NextResponse> {
  const duration = Temporal.Duration.from({ hours: 1 })

  if (await isDuplicate('cron:videos:update', duration)) {
    return createErrorResponse(
      429,
      'There has been no interval since the last run.'
    )
  }

  const currentDateTime = Temporal.Now.instant()
  const supabaseClient = createSupabaseClient({
    token: process.env.SUPABASE_SERVICE_ROLE_KEY
  })
  const { data: channels, error } = await supabaseClient
    .from('channels')
    .select('id, slug')
    .is('deleted_at', null)

  if (error) {
    return createErrorResponse(500, error.message)
  }

  const {
    data: { items }
  } = await youtubeClient.channels.list({
    id: channels.map((channel) => channel.slug),
    maxResults: 50,
    part: ['contentDetails', 'id']
  })

  if (!items || items.length < 1) {
    return createErrorResponse(404, 'There are no channels.')
  }

  const results = await Promise.allSettled(
    channels.map((channel) => {
      const ch = items.find((item) => item.id === channel.slug)

      if (!ch?.contentDetails?.relatedPlaylists?.uploads) {
        return Promise.reject(
          new TypeError('The uploads playlist does not exist.')
        )
      }

      return scrape({
        channelID: channel.id,
        currentDateTime,
        playlistID: ch.contentDetails.relatedPlaylists.uploads,
        supabaseClient
      })
    })
  )

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(result.reason)
    } else {
      for (const nextResult of result.value) {
        if (nextResult.status === 'rejected') {
          console.error(nextResult.reason)
        }
      }
    }
  }

  return new NextResponse(null, {
    status: 204
  })
}

export const GET = POST
