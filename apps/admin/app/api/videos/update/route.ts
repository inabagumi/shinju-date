import { type youtube_v3 as youtube } from '@googleapis/youtube'
import { Temporal } from '@js-temporal/polyfill'
import { type Database } from '@shinju-date/schema'
import { Image, decode } from 'imagescript'
import { nanoid } from 'nanoid'
import { NextResponse } from 'next/server'
import { createAlgoliaClient } from '@/lib/algolia'
import { isDuplicate } from '@/lib/redis'
import { createErrorResponse } from '@/lib/session'
import { type TypedSupabaseClient, createSupabaseClient } from '@/lib/supabase'
import { youtubeClient } from '@/lib/youtube'

const CHECK_DUPLICATE_KEY = 'cron:videos:update'
const CHECK_DURATION = Temporal.Duration.from({ minutes: 1, seconds: 30 })
const DEFAULT_CACHE_CONTROL_MAX_AGE = Temporal.Duration.from({ days: 30 })

function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && typeof value !== 'undefined'
}

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

    yield* items
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

    yield* items.filter((item) => item.contentDetails?.videoId)

    if (!all || !nextPageToken) {
      break
    }

    pageToken = nextPageToken
  }
}

type FilteredYouTubeVideo = youtube.Schema$Video & {
  contentDetails: NonNullable<youtube.Schema$Video['contentDetails']>
  id: NonNullable<youtube.Schema$Video['id']>
  snippet: NonNullable<youtube.Schema$Video['snippet']> & {
    publishedAt: NonNullable<youtube.Schema$VideoSnippet['publishedAt']>
  }
}

function getPublishedAt(video: FilteredYouTubeVideo): Temporal.Instant {
  const publishedAt =
    video.liveStreamingDetails?.actualStartTime ??
    video.liveStreamingDetails?.scheduledStartTime ??
    video.snippet.publishedAt

  return Temporal.Instant.from(publishedAt)
}

type GetVideosOptions = {
  all?: boolean
}

async function* getVideos(
  channelID: string,
  { all = false }: GetVideosOptions = {}
): AsyncGenerator<FilteredYouTubeVideo, void, undefined> {
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

    yield* items.filter(
      (item): item is FilteredYouTubeVideo =>
        typeof item.id === 'string' &&
        typeof item.snippet?.publishedAt === 'string' &&
        'contentDetails' in item
    )
  }
}

type SavedThumbnail = Omit<
  Database['public']['Tables']['thumbnails']['Row'],
  'created_at'
>

type SavedVideo = Omit<
  Database['public']['Tables']['videos']['Row'],
  'channel_id' | 'updated_at' | 'url'
> & {
  thumbnails: SavedThumbnail | SavedThumbnail[] | null
}

type GetSavedVideosOptions = {
  ids: string[]
  supabaseClient: TypedSupabaseClient
}

async function* getSavedVideos({
  ids,
  supabaseClient
}: GetSavedVideosOptions): AsyncGenerator<SavedVideo, void, undefined> {
  for (let i = 0; i < ids.length; i += 100) {
    const videoIDs = ids.slice(i, i + 100)
    const { data: videos, error } = await supabaseClient
      .from('videos')
      .select(
        `
          id,
          created_at,
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
      .in('slug', videoIDs)

    if (error) {
      throw error
    }

    yield* videos
  }
}

type StaticThumbnail = {
  height: number
  url: string
  width: number
}

function getThumbnail(video: FilteredYouTubeVideo): StaticThumbnail {
  const thumbnail =
    video.snippet.thumbnails &&
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

async function getBlurDataURL(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const originalImage = await decode(new Uint8Array(buffer))

  if (!(originalImage instanceof Image)) {
    throw new TypeError('A blob in an unsupported format was given.')
  }

  const blurImage = originalImage.resize(
    10,
    Math.floor(10 * (originalImage.height / originalImage.width))
  )
  const binary = await blurImage.encodeJPEG(75)
  const base64 = btoa(String.fromCharCode(...binary))

  return `data:image/jpeg;base64,${base64}`
}

type UploadThumbnailOptions = {
  currentDateTime: Temporal.Instant
  supabaseClient: TypedSupabaseClient
  thumbnail?: SavedThumbnail
  video: FilteredYouTubeVideo
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
        deleted_at: null,
        updated_at: currentDateTime.toString()
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

  const blurDataURL = await getBlurDataURL(imageBody)

  return {
    blur_data_url: blurDataURL,
    deleted_at: null,
    height: newThumbnail.height,
    path: data.path,
    updated_at: currentDateTime.toString(),
    width: newThumbnail.width,

    ...(thumbnail
      ? {
          id: thumbnail.id
        }
      : {})
  }
}

type UpsertThumbnailsOptions = {
  currentDateTime: Temporal.Instant
  savedVideos?: SavedVideo[]
  supabaseClient: TypedSupabaseClient
  videos: FilteredYouTubeVideo[]
}

async function upsertThumbnails({
  currentDateTime,
  savedVideos = [],
  supabaseClient,
  videos
}: UpsertThumbnailsOptions): Promise<{ id: number; path: string }[]> {
  const results = await Promise.allSettled(
    videos.map((video) => {
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

  const values = results
    .map((result) => (result.status !== 'rejected' ? result.value : null))
    .filter(isNonNullable)
  const upsertValues = values.filter((value) => value.id)
  const insertValues = values.filter((value) => !value.id)

  const upsertResults = await Promise.allSettled([
    supabaseClient
      .from('thumbnails')
      .upsert(upsertValues)
      .select('id, path')
      .then(({ data, error }) => {
        if (error) {
          throw error
        }

        return data
      }),
    supabaseClient
      .from('thumbnails')
      .insert(insertValues)
      .select('id, path')
      .then(({ data, error }) => {
        if (error) {
          throw error
        }

        return data
      })
  ])

  const resultThumbnails: { id: number; path: string }[] = []

  for (const result of upsertResults) {
    switch (result.status) {
      case 'fulfilled':
        resultThumbnails.push(...result.value)

        break
      case 'rejected':
        console.error(result.reason)

        break
    }
  }

  return resultThumbnails
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
}: ScrapeOptions): Promise<Video[]> {
  const videos: FilteredYouTubeVideo[] = []
  for await (const video of getVideos(playlistID)) {
    videos.push(video)
  }

  const videoIDs = videos.map((video) => video.id)
  const savedVideos: SavedVideo[] = []

  for await (const savedVideo of getSavedVideos({
    ids: videoIDs,
    supabaseClient
  })) {
    savedVideos.push(savedVideo)
  }

  const thumbnails = await upsertThumbnails({
    currentDateTime,
    savedVideos,
    supabaseClient,
    videos
  })

  const values = videos
    .map<Database['public']['Tables']['videos']['Insert'] | null>((video) => {
      const savedVideo = savedVideos.find(
        (savedVideo) => savedVideo.slug === video.id
      )
      const thumbnail = thumbnails.find((thumbnail) =>
        thumbnail.path.startsWith(`${video.id}/`)
      )
      const publishedAt = getPublishedAt(video)
      const updateValue: Partial<
        Database['public']['Tables']['videos']['Insert']
      > = {}

      if (savedVideo) {
        const savedPublishedAt = Temporal.Instant.from(savedVideo.published_at)
        const newDuration = video.contentDetails.duration ?? 'P0D'

        let detectUpdate = false

        if (savedVideo.duration !== newDuration) {
          updateValue.duration = newDuration

          detectUpdate = true
        } else {
          updateValue.duration = savedVideo.duration
        }

        if (!savedPublishedAt.equals(publishedAt)) {
          updateValue.published_at = publishedAt.toString()

          detectUpdate = true
        } else {
          updateValue.published_at = savedVideo.published_at
        }

        if (thumbnail && savedVideo.thumbnail_id !== thumbnail.id) {
          updateValue.thumbnail_id = thumbnail.id

          detectUpdate = true
        } else {
          updateValue.thumbnail_id = savedVideo.thumbnail_id
        }

        if (savedVideo.title !== video.snippet.title) {
          updateValue.title = video.snippet.title ?? ''

          detectUpdate = true
        } else {
          updateValue.title = savedVideo.title
        }

        if (savedVideo.deleted_at) {
          detectUpdate = true
        }

        if (!detectUpdate) {
          return null
        }

        updateValue.id = savedVideo.id
        updateValue.created_at = savedVideo.created_at
      }

      return {
        channel_id: channelID,
        created_at: currentDateTime.toString(),
        deleted_at: null,
        duration: video.contentDetails.duration ?? 'P0D',
        published_at: publishedAt.toString(),
        slug: video.id,
        thumbnail_id: thumbnail?.id,
        title: video.snippet.title ?? '',
        updated_at: currentDateTime.toString(),
        url: `https://www.youtube.com/watch?v=${video.id}`,
        ...updateValue
      }
    })
    .filter(isNonNullable)

  if (values.length < 1) {
    return []
  }

  const upsertValues = values.filter((value) => value.id)
  const insertValues = values.filter((value) => !value.id)

  const results = await Promise.allSettled(
    [
      upsertValues.length > 0
        ? supabaseClient
            .from('videos')
            .upsert(upsertValues)
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
            .then(({ data, error }) => {
              if (error) {
                throw error
              }

              return data
            })
        : null,
      insertValues.length > 0
        ? supabaseClient
            .from('videos')
            .insert(insertValues)
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
            .then(({ data, error }) => {
              if (error) {
                throw error
              }

              return data
            })
        : null
    ].filter(isNonNullable)
  )

  const resultVideos: Video[] = []

  for (const result of results) {
    switch (result.status) {
      case 'fulfilled':
        resultVideos.push(...result.value)

        break
      case 'rejected':
        console.error(result.reason)

        break
    }
  }

  return resultVideos
}

type SaveToAlgoliaOptions = {
  videos: Video[]
}

async function saveToAlgolia({ videos }: SaveToAlgoliaOptions) {
  const algoliaClient = createAlgoliaClient({
    apiKey: process.env.ALGOLIA_ADMIN_API_KEY
  })

  const objects = videos
    .map((video) => {
      const channel = Array.isArray(video.channels)
        ? video.channels[0]
        : video.channels

      if (!channel) {
        return null
      }

      const publishedAt = Temporal.Instant.from(video.published_at)

      return {
        channel: {
          id: channel.slug,
          title: channel.name
        },
        duration: video.duration,
        id: video.slug,
        objectID: video.slug,
        publishedAt: publishedAt.epochSeconds,
        title: video.title
      }
    })
    .filter(isNonNullable)

  await algoliaClient.saveObjects(objects)

  console.log(objects)
}

export async function POST(): Promise<NextResponse> {
  if (await isDuplicate(CHECK_DUPLICATE_KEY, CHECK_DURATION)) {
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
      for (const video of result.value) {
        videos.push(video)
      }
    }
  }

  if (videos.length > 0) {
    await saveToAlgolia({ videos })
  }

  return new NextResponse(null, {
    status: 204
  })
}

export const GET = POST
