import type { TablesInsert } from '@shinju-date/database'
import retryableFetch from '@shinju-date/retryable-fetch'
import { toDBString } from '@shinju-date/temporal-fns'
import type { YouTubeVideo } from '@shinju-date/youtube-scraper'
import mime from 'mime'
import { nanoid } from 'nanoid'
import sharp from 'sharp'
import { Temporal } from 'temporal-polyfill'
import type { SavedThumbnail } from '@/lib/database'
import type { TypedSupabaseClient } from '@/lib/supabase'

const DEFAULT_CACHE_CONTROL_MAX_AGE = Temporal.Duration.from({
  days: 365,
})

/** Default dimensions when the source only provides a template URL (e.g. Twitch). */
export const DEFAULT_THUMBNAIL_WIDTH = 1280
export const DEFAULT_THUMBNAIL_HEIGHT = 720

interface StaticThumbnail {
  height: number
  url: string
  width: number
}

function getThumbnail(video: YouTubeVideo): StaticThumbnail {
  const thumbnail =
    video.snippet.thumbnails &&
    (video.snippet.thumbnails.maxres ??
      video.snippet.thumbnails.standard ??
      video.snippet.thumbnails.high)

  if (!thumbnail?.url || !thumbnail.width || !thumbnail.height) {
    throw new TypeError('Thumbnail URL does not exist.')
  }

  return {
    height: thumbnail.height,
    url: thumbnail.url,
    width: thumbnail.width,
  }
}

/**
 * Resolves Twitch (and similar) thumbnail template URLs that use
 * `%{width}x%{height}` or `{width}x{height}` placeholders.
 */
export function resolveThumbnailTemplateUrl(
  url: string,
  width = DEFAULT_THUMBNAIL_WIDTH,
  height = DEFAULT_THUMBNAIL_HEIGHT,
): string {
  return url
    .replaceAll('%{width}', String(width))
    .replaceAll('%{height}', String(height))
    .replaceAll('{width}', String(width))
    .replaceAll('{height}', String(height))
}

async function getBlurDataURL(data: ArrayBuffer): Promise<string> {
  const buffer = await sharp(data).resize(10).toBuffer()

  return `data:image/jpeg;base64,${buffer.toString('base64')}`
}

/**
 * Options for uploading a thumbnail from a YouTube video
 */
export interface ThumbnailOptions {
  currentDateTime?: Temporal.Instant
  dryRun?: boolean
  originalVideo: YouTubeVideo
  savedThumbnail?: SavedThumbnail
  supabaseClient: TypedSupabaseClient
}

/**
 * Options for uploading a thumbnail from a raw image URL (e.g. Twitch)
 */
export interface ThumbnailFromUrlOptions {
  currentDateTime?: Temporal.Instant
  dryRun?: boolean
  height?: number
  mediaId: string
  savedThumbnail?: SavedThumbnail
  supabaseClient: TypedSupabaseClient
  thumbnailUrl: string
  width?: number
}

/**
 * Handles image operations including downloading, processing, and uploading
 * Can be used for thumbnails, icons, avatars, and other image types
 */
export class ImageProcessor {
  #currentDateTime: Temporal.Instant
  #dryRun: boolean
  #height: number
  #savedThumbnail: SavedThumbnail | undefined
  #supabaseClient: TypedSupabaseClient
  #url: string
  #videoID: string
  #width: number

  /**
   * Uploads a thumbnail from a YouTube video
   * @param options - The image upload options
   * @returns The thumbnail insert data or null if no upload is needed
   */
  static upload(
    options: ThumbnailOptions,
  ): Promise<TablesInsert<'thumbnails'> | null> {
    const { height, url, width } = getThumbnail(options.originalVideo)

    const fromUrlOptions: ThumbnailFromUrlOptions = {
      height,
      mediaId: options.originalVideo.id,
      supabaseClient: options.supabaseClient,
      thumbnailUrl: url,
      width,
    }

    if (options.currentDateTime !== undefined) {
      fromUrlOptions.currentDateTime = options.currentDateTime
    }
    if (options.dryRun !== undefined) {
      fromUrlOptions.dryRun = options.dryRun
    }
    if (options.savedThumbnail !== undefined) {
      fromUrlOptions.savedThumbnail = options.savedThumbnail
    }

    return new ImageProcessor(fromUrlOptions).upload()
  }

  /**
   * Uploads a thumbnail from a direct or templated image URL
   */
  static uploadFromUrl(
    options: ThumbnailFromUrlOptions,
  ): Promise<TablesInsert<'thumbnails'> | null> {
    return new ImageProcessor(options).upload()
  }

  constructor({
    currentDateTime = Temporal.Now.instant(),
    dryRun = false,
    height = DEFAULT_THUMBNAIL_HEIGHT,
    mediaId,
    savedThumbnail,
    supabaseClient,
    thumbnailUrl,
    width = DEFAULT_THUMBNAIL_WIDTH,
  }: ThumbnailFromUrlOptions) {
    this.#currentDateTime = currentDateTime
    this.#dryRun = dryRun
    this.#height = height
    this.#savedThumbnail = savedThumbnail
    this.#supabaseClient = supabaseClient
    this.#url = resolveThumbnailTemplateUrl(thumbnailUrl, width, height)
    this.#videoID = mediaId
    this.#width = width
  }

  async upload(): Promise<TablesInsert<'thumbnails'> | null> {
    if (this.#savedThumbnail?.updated_at) {
      const updatedAt = Temporal.Instant.from(this.#savedThumbnail.updated_at)

      if (
        Temporal.Instant.compare(
          updatedAt.add({ minutes: 5 }),
          this.#currentDateTime,
        ) > 0
      ) {
        if (this.#savedThumbnail.deleted_at) {
          return {
            ...this.#savedThumbnail,
            deleted_at: null,
            updated_at: toDBString(this.#currentDateTime),
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
      headers: requestHeaders,
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
          updated_at: toDBString(this.#currentDateTime),
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
            unit: 'second',
          }).toString(10),
          contentType,
          upsert: false,
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
      ...(this.#savedThumbnail ? { id: this.#savedThumbnail.id } : {}),
      path,
      updated_at: toDBString(this.#currentDateTime),
      width: this.#width,
    }
  }
}
