import { Temporal } from '@js-temporal/polyfill'
import { type Database } from '@shinju-date/schema'
import mime from 'mime'
import { nanoid } from 'nanoid'
import PQueue from 'p-queue'
import sharp from 'sharp'
import { captureException } from '@/lib/logging'
import { type TypedSupabaseClient } from '@/lib/supabase'
import {
  type FilteredYouTubeChannel,
  type FilteredYouTubeVideo,
  getPlaylistItems,
  getVideos
} from '@/lib/youtube'
import DB, { type Video } from './db'
import { getPublishedAt, isNonNullable, retryableFetch } from './helpers'
import {
  type SavedChannel,
  type SavedThumbnail,
  type SavedVideo
} from './types'

const DEFAULT_CACHE_CONTROL_MAX_AGE = Temporal.Duration.from({ days: 365 })

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

async function getBlurDataURL(data: ArrayBuffer): Promise<string> {
  const buffer = await sharp(data).resize(10).toBuffer()

  return `data:image/jpeg;base64,${buffer.toString('base64')}`
}

export type ThumbnailOptions = {
  currentDateTime?: Temporal.Instant
  dryRun?: boolean
  originalVideo: FilteredYouTubeVideo
  savedThumbnail?: SavedThumbnail
  supabaseClient: TypedSupabaseClient
}

export type UpsertThumbnailsOptions = {
  db: DB
  options: Omit<ThumbnailOptions, 'originalVideo' | 'savedThumbnail'>
  originalVideos: FilteredYouTubeVideo[]
  savedVideos: SavedVideo[]
}

export class Thumbnail {
  #currentDateTime: Temporal.Instant
  #dryRun: boolean
  #height: number
  #savedThumbnail: SavedThumbnail | undefined
  #supabaseClient: TypedSupabaseClient
  #url: string
  #videoID: string
  #width: number

  static upload(
    options: ThumbnailOptions
  ): Promise<Database['public']['Tables']['thumbnails']['Insert'] | null> {
    const instance = new Thumbnail(options)

    return instance.upload()
  }

  static async upsertThumbnails({
    db,
    options,
    originalVideos,
    savedVideos
  }: UpsertThumbnailsOptions): Promise<{ id: number; path: string }[]> {
    const queue = new PQueue({
      concurrency: 12,
      interval: 250
    })
    const results = await Promise.allSettled(
      originalVideos.map((originalVideo) => {
        const savedVideo = savedVideos.find(
          (savedVideo) => savedVideo.slug === originalVideo.id
        )
        const savedThumbnail = savedVideo?.thumbnails
          ? Array.isArray(savedVideo.thumbnails)
            ? savedVideo.thumbnails[0]
            : savedVideo.thumbnails
          : undefined

        return queue.add(() =>
          Thumbnail.upload({
            ...options,
            originalVideo,
            savedThumbnail
          })
        )
      })
    )

    const values: Database['public']['Tables']['thumbnails']['Insert'][] = []

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        values.push(result.value)
      } else if (result.status === 'rejected') {
        captureException(result.reason)
      }
    }

    if (options.dryRun) {
      return []
    }

    return db.upsertThumbnails(values)
  }

  constructor({
    currentDateTime = Temporal.Now.instant(),
    dryRun = false,
    originalVideo,
    savedThumbnail,
    supabaseClient
  }: ThumbnailOptions) {
    const { height, url, width } = getThumbnail(originalVideo)

    this.#currentDateTime = currentDateTime
    this.#dryRun = dryRun
    this.#height = height
    this.#savedThumbnail = savedThumbnail
    this.#supabaseClient = supabaseClient
    this.#url = url
    this.#videoID = originalVideo.id
    this.#width = width
  }

  async upload(): Promise<
    Database['public']['Tables']['thumbnails']['Insert'] | null
  > {
    if (this.#savedThumbnail?.updated_at) {
      const updatedAt = Temporal.Instant.from(this.#savedThumbnail.updated_at)

      if (
        Temporal.Instant.compare(
          updatedAt.add({ minutes: 5 }),
          this.#currentDateTime
        ) > 0
      ) {
        if (this.#savedThumbnail.deleted_at) {
          return {
            ...this.#savedThumbnail,
            deleted_at: null,
            updated_at: this.#currentDateTime.toString()
          }
        }

        return null
      }
    }

    const requestHeaders = new Headers()

    if (this.#savedThumbnail?.etag) {
      requestHeaders.set('If-None-Match', this.#savedThumbnail.etag)
    }

    const imageRes = await retryableFetch(this.#url, {
      headers: requestHeaders
    })

    const etag = imageRes.headers.get('etag')

    if (imageRes.status === 304) {
      // The body is read to reuse the socket.
      // see https://github.com/nodejs/undici/issues/1203#issuecomment-1398191693
      await imageRes.arrayBuffer()

      if (
        this.#savedThumbnail &&
        (this.#savedThumbnail.deleted_at || !this.#savedThumbnail.etag)
      ) {
        return {
          ...this.#savedThumbnail,
          deleted_at: null,
          etag,
          updated_at: this.#currentDateTime.toString()
        }
      }

      return null
    }

    const imageBody = await imageRes.arrayBuffer()
    const contentType = imageRes.headers.get('Content-Type') ?? 'image/jpeg'
    const extension = mime.getExtension(contentType) ?? 'jpg'
    const path = `${this.#videoID}/${nanoid()}.${extension}`

    if (!this.#dryRun) {
      const { error } = await this.#supabaseClient.storage
        .from('thumbnails')
        .upload(path, imageBody, {
          cacheControl: DEFAULT_CACHE_CONTROL_MAX_AGE.total({
            unit: 'second'
          }).toString(10),
          contentType,
          upsert: false
        })

      if (error) {
        throw error
      }
    }

    const blurDataURL = await getBlurDataURL(imageBody)

    return {
      blur_data_url: blurDataURL,
      deleted_at: null,
      etag,
      height: this.#height,
      ...(this.#savedThumbnail
        ? {
            id: this.#savedThumbnail.id
          }
        : {}),
      path,
      updated_at: this.#currentDateTime.toString(),
      width: this.#width
    }
  }
}

export type ScraperOptions = {
  channel: FilteredYouTubeChannel
  currentDateTime?: Temporal.Instant
  dryRun?: boolean
  savedChannel: SavedChannel
  supabaseClient: TypedSupabaseClient
}

export default class Scraper {
  #channel: FilteredYouTubeChannel
  #currentDateTime: Temporal.Instant
  #db: DB
  #dryRun: boolean
  #savedChannel: SavedChannel

  constructor({
    channel,
    currentDateTime = Temporal.Now.instant(),
    dryRun = false,
    savedChannel,
    supabaseClient
  }: ScraperOptions) {
    this.#channel = channel
    this.#currentDateTime = currentDateTime
    this.#db = new DB(supabaseClient)
    this.#dryRun = dryRun
    this.#savedChannel = savedChannel
  }

  get playlistID(): string {
    return this.#channel.contentDetails.relatedPlaylists.uploads
  }

  async *getVideos(): AsyncGenerator<FilteredYouTubeVideo, void, undefined> {
    const videoIDs: string[] = []

    for await (const playlistItem of getPlaylistItems({
      playlistID: this.playlistID
    })) {
      videoIDs.push(playlistItem.contentDetails.videoId)
    }

    yield* getVideos({ ids: videoIDs })
  }

  async scrape(): Promise<Video[]> {
    const originalVideos: FilteredYouTubeVideo[] = []

    for await (const video of this.getVideos()) {
      originalVideos.push(video)
    }

    const videoIDs = originalVideos.map((video) => video.id)
    const savedVideos: SavedVideo[] = []

    for await (const savedVideo of this.#db.getSavedVideos(videoIDs)) {
      savedVideos.push(savedVideo)
    }

    const thumbnails = await Thumbnail.upsertThumbnails({
      db: this.#db,
      options: {
        currentDateTime: this.#currentDateTime,
        dryRun: this.#dryRun,
        supabaseClient: this.#db.client
      },
      originalVideos,
      savedVideos
    })

    const values = originalVideos
      .map<Database['public']['Tables']['videos']['Insert'] | null>(
        (originalVideo) => {
          const savedVideo = savedVideos.find(
            (savedVideo) => savedVideo.slug === originalVideo.id
          )
          const thumbnail = thumbnails.find((thumbnail) =>
            thumbnail.path.startsWith(`${originalVideo.id}/`)
          )
          const publishedAt = getPublishedAt(originalVideo)
          const updateValue: Partial<
            Database['public']['Tables']['videos']['Insert']
          > = {}

          if (savedVideo) {
            const savedPublishedAt = Temporal.Instant.from(
              savedVideo.published_at
            )
            const newDuration = originalVideo.contentDetails.duration ?? 'P0D'

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

            if (savedVideo.title !== originalVideo.snippet.title) {
              updateValue.title = originalVideo.snippet.title ?? ''

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
            channel_id: this.#savedChannel.id,
            created_at: this.#currentDateTime.toString(),
            deleted_at: null,
            duration: originalVideo.contentDetails.duration ?? 'P0D',
            published_at: publishedAt.toString(),
            slug: originalVideo.id,
            thumbnail_id: thumbnail?.id,
            title: originalVideo.snippet.title ?? '',
            updated_at: this.#currentDateTime.toString(),
            url: `https://www.youtube.com/watch?v=${originalVideo.id}`,
            ...updateValue
          }
        }
      )
      .filter(isNonNullable)

    if (values.length < 1) {
      return []
    }

    if (this.#dryRun) {
      return []
    }

    return this.#db.upsertVideos(values)
  }
}
