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

  if (!thumbnail || !thumbnail.url || !thumbnail.width || !thumbnail.height) {
    throw new TypeError('Thumbnail URL does not exist.')
  }

  return {
    height: thumbnail.height,
    url: thumbnail.url,
    width: thumbnail.width,
  }
}

async function getBlurDataURL(data: ArrayBuffer): Promise<string> {
  const buffer = await sharp(data).resize(10).toBuffer()

  return `data:image/jpeg;base64,${buffer.toString('base64')}`
}

/**
 * Options for uploading a thumbnail
 */
export interface ThumbnailOptions {
  currentDateTime?: Temporal.Instant
  dryRun?: boolean
  originalVideo: YouTubeVideo
  savedThumbnail?: SavedThumbnail
  supabaseClient: TypedSupabaseClient
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
   * Uploads an image (thumbnail, icon, etc.)
   * @param options - The image upload options
   * @returns The thumbnail insert data or null if no upload is needed
   */
  static upload(
    options: ThumbnailOptions,
  ): Promise<TablesInsert<'thumbnails'> | null> {
    const instance = new ImageProcessor(options)

    return instance.upload()
  }

  constructor({
    currentDateTime = Temporal.Now.instant(),
    dryRun = false,
    originalVideo,
    savedThumbnail,
    supabaseClient,
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
