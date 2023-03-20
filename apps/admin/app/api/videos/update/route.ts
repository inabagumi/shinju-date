import { type youtube_v3 as youtube } from '@googleapis/youtube'
import { Temporal } from '@js-temporal/polyfill'
import { type Database } from '@shinju-date/schema'
import { nanoid } from 'nanoid'
import { NextResponse } from 'next/server'
import { isDuplicate } from '@/lib/redis'
import { createErrorResponse } from '@/lib/session'
import { type TypedSupabaseClient, createSupabaseClient } from '@/lib/supabase'
import { youtubeClient } from '@/lib/youtube'

type GetPlaylistItemsOptions = {
  all?: boolean
}

async function* getPlaylistItems(
  playlistID: string,
  { all = false }: GetPlaylistItemsOptions = {}
): AsyncGenerator<youtube.Schema$PlaylistItem, void, undefined> {
  let pageToken: string | undefined

  while (true) {
    const {
      data: { items, nextPageToken }
    } = await youtubeClient.playlistItems.list({
      maxResults: all ? 50 : 10,
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
): AsyncGenerator<
  youtube.Schema$Video & {
    id: NonNullable<youtube.Schema$Video['id']>
  },
  void,
  undefined
> {
  const playlistItems: youtube.Schema$PlaylistItem[] = []

  for await (const playlistItem of getPlaylistItems(channelID, { all })) {
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
        yield {
          ...item,
          id: item.id
        }
      }
    }
  }
}

type Thumbnail = Pick<
  Database['public']['Tables']['thumbnails']['Row'],
  'blur_data_url' | 'height' | 'id' | 'path' | 'updated_at' | 'width'
>

type SavedVideo = Pick<
  Database['public']['Tables']['videos']['Row'],
  'id' | 'duration' | 'published_at' | 'slug' | 'thumbnail_id' | 'title'
> & {
  thumbnails: Thumbnail | Thumbnail[] | null
}

type SortOutVideosOptions = {
  supabaseClient: TypedSupabaseClient
  videos: (youtube.Schema$Video & {
    id: NonNullable<youtube.Schema$Video['id']>
  })[]
}

type SortOutVideosResult = [
  savedVideos: SavedVideo[],
  unsavedVideos: (youtube.Schema$Video & {
    id: NonNullable<youtube.Schema$Video['id']>
  })[]
]

async function sortOutVideos({
  supabaseClient,
  videos
}: SortOutVideosOptions): Promise<SortOutVideosResult> {
  const videoIDs = videos.map((video) => video.id)
  const savedVideos: SavedVideo[] = []

  for (let i = 0; i < videoIDs.length; i += 100) {
    const { data, error } = await supabaseClient
      .from('videos')
      .select(
        'id, duration, published_at, slug, thumbnail_id, thumbnails (blur_data_url, height, id, path, updated_at, width), title'
      )
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

  return [savedVideos, unsavedVideos]
}

function getThumbnail(video: youtube.Schema$Video): Required<{
  [K in keyof youtube.Schema$Thumbnail]: NonNullable<
    youtube.Schema$Thumbnail[K]
  >
}> {
  const thumbnail =
    video.snippet?.thumbnails &&
    (video.snippet.thumbnails.maxres ??
      video.snippet.thumbnails.standard ??
      video.snippet.thumbnails.high)

  if (!thumbnail || !thumbnail.url || !thumbnail.width || !thumbnail.height) {
    throw new TypeError('Thumbnail URL does not exist.')
  }

  return {
    height: thumbnail.height,
    url: thumbnail.url,
    width: thumbnail.width
  }
}

type GetBlurDataURLOptions = {
  height: number
  path: string
  supabaseClient: TypedSupabaseClient
  width: number
}

async function getBlurDataURL({
  height,
  path,
  supabaseClient,
  width
}: GetBlurDataURLOptions): Promise<string> {
  const { data: blob, error } = await supabaseClient.storage
    .from('thumbnails')
    .download(path, {
      transform: {
        height: Math.floor(10 * (height / width)),
        resize: 'cover',
        width: 10
      }
    })

  if (error) {
    throw error
  }

  const buffer = await blob.arrayBuffer()
  const binary = new Uint8Array(buffer)
  const base64 = btoa(String.fromCharCode(...binary))

  return `data:${blob.type};base64,${base64}`
}

type UploadThumbnailOptions = {
  currentDateTime: Temporal.Instant
  supabaseClient: TypedSupabaseClient
  thumbnail?: Thumbnail
  video: youtube.Schema$Video & {
    id: NonNullable<youtube.Schema$Video['id']>
  }
}

async function uploadThumbnail({
  currentDateTime,
  supabaseClient,
  thumbnail,
  video
}: UploadThumbnailOptions): Promise<
  Database['public']['Tables']['thumbnails']['Insert'] | null
> {
  const newThumbnail = getThumbnail(video)
  const imageRes = await fetch(newThumbnail.url)
  const etag = imageRes.headers.get('etag')

  let imageUpdatedAt: Temporal.Instant | undefined

  if (etag && /"\d+"/.test(etag)) {
    const unixTime = parseInt(etag.slice(1, -1), 10)
    imageUpdatedAt = Temporal.Instant.fromEpochSeconds(unixTime)
  }

  if (!imageRes.ok) {
    throw new TypeError('Failed to fetch thumbnail.')
  }

  if (
    thumbnail &&
    (!imageUpdatedAt ||
      Temporal.Instant.compare(
        Temporal.Instant.from(thumbnail.updated_at),
        imageUpdatedAt
      ) > 0)
  ) {
    return null
  }

  const imageBody = await imageRes.blob()
  const contentType = imageRes.headers.get('Content-Type') ?? 'image/jpeg'

  const { data, error } = await supabaseClient.storage
    .from('thumbnails')
    .upload(`${video.id}/${nanoid()}.jpg`, imageBody, {
      cacheControl: 'max-age=2592000',
      contentType,
      upsert: false
    })

  if (error) {
    throw error
  }

  const blurDataURL = await getBlurDataURL({
    height: newThumbnail.height,
    path: data.path,
    supabaseClient,
    width: newThumbnail.width
  })

  return {
    blur_data_url: blurDataURL,
    height: newThumbnail.height,
    id: thumbnail?.id,
    path: data.path,
    updated_at: currentDateTime.toJSON(),
    width: newThumbnail.width
  }
}

type UpsertThumbnailsOptions = {
  currentDateTime: Temporal.Instant
  savedVideos?: SavedVideo[]
  supabaseClient: TypedSupabaseClient
  videos: (youtube.Schema$Video & {
    id: NonNullable<youtube.Schema$Video['id']>
  })[]
}

async function upsertThumbnails({
  currentDateTime,
  savedVideos = [],
  supabaseClient,
  videos
}: UpsertThumbnailsOptions): Promise<{ id: number; path: string }[]> {
  const results = await Promise.allSettled(
    videos.map(async (video) => {
      const savedVideo = savedVideos.find(
        (savedVideo) => savedVideo.slug === video.id
      )
      const thumbnail = savedVideo?.thumbnails
        ? Array.isArray(savedVideo.thumbnails)
          ? savedVideo.thumbnails[0]
          : savedVideo.thumbnails
        : undefined

      return uploadThumbnail({
        currentDateTime,
        supabaseClient,
        thumbnail,
        video
      })
    })
  )

  const upsertValues: Database['public']['Tables']['thumbnails']['Insert'][] =
    []

  for (const result of results) {
    if (result.status === 'rejected' || !result.value) {
      continue
    }

    upsertValues.push(result.value)
  }

  const { data, error } = await supabaseClient
    .from('thumbnails')
    .upsert(upsertValues)
    .select('id, path')

  if (error) {
    throw error
  }

  return data
}

type Video = Pick<
  Database['public']['Tables']['videos']['Row'],
  'slug' | 'title' | 'url'
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
  const videos: (youtube.Schema$Video & {
    id: NonNullable<youtube.Schema$Video['id']>
  })[] = []
  for await (const video of getVideos(playlistID)) {
    videos.push(video)
  }

  const [savedVideos, unsavedVideos] = await sortOutVideos({
    supabaseClient,
    videos
  })

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

      const [newThumbnail] = await upsertThumbnails({
        currentDateTime,
        savedVideos: [savedVideo],
        supabaseClient,
        videos: [newVideo]
      })
      const savedPublishedAt = Temporal.Instant.from(savedVideo.published_at)
      const newDuration = newVideo.contentDetails.duration ?? 'P0D'

      if (
        savedVideo.duration === newDuration &&
        savedPublishedAt.equals(newPublishedAt) &&
        (!newThumbnail || savedVideo.thumbnail_id === newThumbnail.id) &&
        savedVideo.title === newVideo.snippet.title
      ) {
        return []
      }

      const { data, error } = await supabaseClient
        .from('videos')
        .update({
          updated_at: currentDateTime.toJSON(),

          ...(savedVideo.duration !== newDuration
            ? {
                duration: newDuration
              }
            : {}),
          ...(!savedPublishedAt.equals(newPublishedAt)
            ? {
                published_at: newPublishedAt.toJSON()
              }
            : {}),
          ...(newThumbnail && savedVideo.thumbnail_id !== newThumbnail.id
            ? {
                thumbnail_id: newThumbnail?.id
              }
            : {}),
          ...(savedVideo.title !== newVideo.snippet.title
            ? {
                title: newVideo.snippet.title ?? ''
              }
            : {})
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

      const thumbnails = await upsertThumbnails({
        currentDateTime,
        supabaseClient,
        videos: unsavedVideos
      })

      for (const value of values) {
        const thumbnail = thumbnails.find((thumbnail) =>
          thumbnail.path.startsWith(`${value.slug}/`)
        )

        if (!thumbnail) {
          continue
        }

        value.thumbnail_id = thumbnail.id
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
