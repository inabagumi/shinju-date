import retryableFetch from '@shinju-date/retryable-fetch'
import { toDBString } from '@shinju-date/temporal-fns'
import mime from 'mime'
import { nanoid } from 'nanoid'
import sharp from 'sharp'
import type { TypedSupabaseClient } from '../../types.js'
import { DatabaseError } from '../database/errors.js'

const BUCKET = 'thumbnails'

/** One year: stored objects are immutable because every upload gets a new path. */
const CACHE_CONTROL_MAX_AGE_SECONDS = 365 * 24 * 60 * 60

/** An image on the source platform to copy into our storage. */
export interface ThumbnailSource {
  height: number
  url: string
  width: number
}

export interface CreateThumbnailOptions {
  /**
   * Folder the image is stored under. Use the platform video ID so stored
   * objects can be traced back to their video.
   */
  folder: string
  now: Temporal.Instant
  source: ThumbnailSource
  supabaseClient: TypedSupabaseClient
}

/** A stored thumbnail: its `thumbnails` row ID and storage path. */
export interface Thumbnail {
  id: string
  path: string
}

async function createBlurDataURL(image: ArrayBuffer): Promise<string> {
  const buffer = await sharp(image).resize(10).jpeg().toBuffer()

  return `data:image/jpeg;base64,${buffer.toString('base64')}`
}

/**
 * Copies an image into the thumbnails bucket and registers it in the
 * `thumbnails` table.
 *
 * @throws When the image cannot be downloaded, stored or registered. Nothing
 *   is left behind in that case.
 */
export async function createThumbnail({
  folder,
  now,
  source,
  supabaseClient,
}: CreateThumbnailOptions): Promise<Thumbnail> {
  const response = await retryableFetch(source.url)
  const contentType = response.headers.get('Content-Type') ?? 'image/jpeg'
  const image = await response.arrayBuffer()

  if (!contentType.startsWith('image/')) {
    throw new TypeError(
      `Expected an image but received "${contentType}": ${source.url}`,
    )
  }

  // Decoding first means a broken image is rejected before anything is stored.
  const blurDataURL = await createBlurDataURL(image)
  const extension = mime.getExtension(contentType) ?? 'jpg'
  const thumbnail: Thumbnail = {
    id: crypto.randomUUID(),
    path: `${folder}/${nanoid()}.${extension}`,
  }

  const { error: uploadError } = await supabaseClient.storage
    .from(BUCKET)
    .upload(thumbnail.path, image, {
      cacheControl: CACHE_CONTROL_MAX_AGE_SECONDS.toString(10),
      contentType,
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const { error: insertError } = await supabaseClient
    .from('thumbnails')
    .insert({
      blur_data_url: blurDataURL,
      etag: response.headers.get('ETag'),
      height: source.height,
      id: thumbnail.id,
      path: thumbnail.path,
      updated_at: toDBString(now),
      width: source.width,
    })

  if (insertError) {
    await supabaseClient.storage.from(BUCKET).remove([thumbnail.path])

    throw new DatabaseError('Failed to insert a thumbnail', insertError)
  }

  return thumbnail
}

/**
 * Removes a thumbnail that ended up unused (its video was not saved).
 * Best effort: a leftover thumbnail is harmless, so failures are ignored.
 */
export async function removeThumbnail(
  supabaseClient: TypedSupabaseClient,
  thumbnail: Thumbnail,
): Promise<void> {
  try {
    await supabaseClient.from('thumbnails').delete().eq('id', thumbnail.id)
    await supabaseClient.storage.from(BUCKET).remove([thumbnail.path])
  } catch {
    // Ignored on purpose, see above.
  }
}
