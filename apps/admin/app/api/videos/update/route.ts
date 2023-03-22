import { type youtube_v3 as youtube } from '@googleapis/youtube'
import { Temporal } from '@js-temporal/polyfill'
import { type Database } from '@shinju-date/schema'
import { nanoid } from 'nanoid'
import { NextResponse } from 'next/server'
import { createAlgoliaClient } from '@/lib/algolia'
import { isDuplicate } from '@/lib/redis'
import { createErrorResponse } from '@/lib/session'
import { type TypedSupabaseClient, createSupabaseClient } from '@/lib/supabase'
import { youtubeClient } from '@/lib/youtube'

const CHECK_DUPLICATE_KEY = 'cron:videos:update'
const DEFAULT_CACHE_CONTROL_MAX_AGE = Temporal.Duration.from({ days: 30 })

type SavedChannel = Pick<
  Database['public']['Tables']['channels']['Row'],
  'id' | 'slug'
>

type GetChannelsOptions = {
  savedChannels?: SavedChannel[]
}

async function* getChannels({
  savedChannels = []
}: GetChannelsOptions): AsyncGenerator<
  youtube.Schema$Channel,
  void,
  undefined
> {
  const channelIDs = savedChannels.map((channel) => channel.slug)

  for (let i = 0; i < channelIDs.length; i += 50) {
    const ids = channelIDs.slice(i, i + 50)
    const {
      data: { items }
    } = await youtubeClient.channels.list({
      id: ids,
      maxResults: ids.length,
      part: ['contentDetails', 'id']
    })

    if (!items || items.length < 1) {
      continue
    }

    for (const item of items) {
      yield item
    }
  }
}

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
      maxResults: all ? 50 : 20,
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

type SavedThumbnail = Omit<
  Database['public']['Tables']['thumbnails']['Row'],
  'created_at'
>

type SavedVideo = Omit<
  Database['public']['Tables']['videos']['Row'],
  'channel_id' | 'created_at' | 'updated_at' | 'url'
> & {
  thumbnails: SavedThumbnail | SavedThumbnail[] | null
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
    const ids = videoIDs.slice(i, i + 100)
    const { data, error } = await supabaseClient
      .from('videos')
      .select(
        `
          id,
          deleted_at,
          duration,
          published_at,
          slug,
          thumbnail_id,
          thumbnails (
            blur_data_url,
            deleted_at,
            height,
            id,
            path,
            updated_at,
            width
          ),
          title
        `
      )
      .in('slug', ids)

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
  thumbnail?: SavedThumbnail
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

  if (etag && /^"\d+"$/.test(etag)) {
    const unixTime = parseInt(etag.slice(1, -1), 10)

    try {
      imageUpdatedAt = Temporal.Instant.fromEpochSeconds(unixTime)
    } catch {
      // skip
    }
  }

  if (!imageUpdatedAt) {
    imageUpdatedAt = Temporal.Now.instant()
  }

  if (!imageRes.ok) {
    throw new TypeError('Failed to fetch thumbnail.')
  }

  if (
    thumbnail &&
    Temporal.Instant.compare(
      Temporal.Instant.from(thumbnail.updated_at),
      imageUpdatedAt
    ) > 0
  ) {
    if (thumbnail.deleted_at) {
      return {
        ...thumbnail,
        deleted_at: null
      }
    }

    return null
  }

  const imageBody = await imageRes.blob()
  const contentType = imageRes.headers.get('Content-Type') ?? 'image/jpeg'

  const { data, error } = await supabaseClient.storage
    .from('thumbnails')
    .upload(`${video.id}/${nanoid()}.jpg`, imageBody, {
      cacheControl: DEFAULT_CACHE_CONTROL_MAX_AGE.total({
        unit: 'second'
      }).toString(10),
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
    deleted_at: null,
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

type VideoChannel = Pick<
  Database['public']['Tables']['channels']['Row'],
  'name' | 'slug' | 'url'
>
type VideoThumbnail = Omit<
  Database['public']['Tables']['thumbnails']['Row'],
  'created_at' | 'deleted_at' | 'id' | 'updated_at'
>

type Video = Pick<
  Database['public']['Tables']['videos']['Row'],
  'duration' | 'published_at' | 'slug' | 'title' | 'url'
> & {
  channels: VideoChannel | VideoChannel[] | null
  thumbnails: VideoThumbnail | VideoThumbnail[] | null
}

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
        !savedVideo.deleted_at &&
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
          deleted_at: null,
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
        .select(
          `
            channels (
              name,
              slug,
              url
            ),
            duration,
            published_at,
            slug,
            thumbnails (
              blur_data_url,
              height,
              path,
              width
            ),
            title,
            url
          `
        )
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
        .select(
          `
            channels (
              name,
              slug,
              url
            ),
            duration,
            published_at,
            slug,
            thumbnails (
              blur_data_url,
              height,
              path,
              width
            ),
            title,
            url
          `
        )

      if (error) {
        throw error
      }

      return data
    })()
  ])
}

type SaveToAlgoliaOptions = {
  supabaseClient: TypedSupabaseClient
  videos: Video[]
}

async function saveToAlgolia({ supabaseClient, videos }: SaveToAlgoliaOptions) {
  const algoliaClient = createAlgoliaClient({
    apiKey: process.env.ALGOLIA_ADMIN_API_KEY
  })

  const objects = videos
    .map((video) => {
      const channel = Array.isArray(video.channels)
        ? video.channels[0]
        : video.channels
      const thumbnail = Array.isArray(video.thumbnails)
        ? video.thumbnails[0]
        : video.thumbnails

      if (!channel || !thumbnail) {
        return {}
      }

      const publishedAt = Temporal.Instant.from(video.published_at)
      const {
        data: { publicUrl: thumbnailURL }
      } = supabaseClient.storage
        .from('thumbnails')
        .getPublicUrl(thumbnail.path, {
          transform: {
            height: Math.floor(thumbnail.width * (1080 / 1920)),
            resize: 'cover',
            width: thumbnail.width
          }
        })

      return {
        channel: {
          id: channel.slug,
          title: channel.name,
          url: channel.url
        },
        duration: video.duration,
        id: video.slug,
        objectID: video.slug,
        publishedAt: publishedAt.epochSeconds,
        thumbnail: {
          height: thumbnail.height,
          preSrc: thumbnail.blur_data_url,
          src: thumbnailURL,
          width: thumbnail.width
        },
        title: video.title,
        url: video.url
      }
    })
    .filter(Boolean) as Record<string, any>[]

  await algoliaClient.saveObjects(objects)

  console.log(objects)
}

export async function POST(): Promise<NextResponse> {
  const duration = Temporal.Duration.from({ minutes: 8 })

  if (await isDuplicate(CHECK_DUPLICATE_KEY, duration)) {
    return createErrorResponse(
      429,
      'There has been no interval since the last run.'
    )
  }

  const currentDateTime = Temporal.Now.instant()
  const supabaseClient = createSupabaseClient({
    token: process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  const { data: savedChannels, error } = await supabaseClient
    .from('channels')
    .select('id, slug')
    .is('deleted_at', null)

  if (error) {
    throw error
  }

  const channels: youtube.Schema$Channel[] = []

  try {
    for await (const channel of getChannels({ savedChannels })) {
      channels.push(channel)
    }
  } catch (error) {
    const message =
      error !== null &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : undefined

    return createErrorResponse(500, message ?? 'Internal Server Error')
  }

  if (channels.length < 1) {
    return createErrorResponse(404, 'There are no channels.')
  }

  const results = await Promise.allSettled(
    savedChannels.map((savedChannel) => {
      const ch = channels.find((item) => item.id === savedChannel.slug)

      if (!ch?.contentDetails?.relatedPlaylists?.uploads) {
        return Promise.reject(
          new TypeError('The uploads playlist does not exist.')
        )
      }

      return scrape({
        channelID: savedChannel.id,
        currentDateTime,
        playlistID: ch.contentDetails.relatedPlaylists.uploads,
        supabaseClient
      })
    })
  )

  const videos: Video[] = []

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(result.reason)
    } else {
      for (const nextResult of result.value) {
        if (nextResult.status === 'rejected') {
          console.error(nextResult.reason)
        } else {
          for (const video of nextResult.value ?? []) {
            videos.push(video)
          }
        }
      }
    }
  }

  if (videos.length > 0) {
    await saveToAlgolia({ supabaseClient, videos })
  }

  return new NextResponse(null, {
    status: 204
  })
}

export const GET = POST
