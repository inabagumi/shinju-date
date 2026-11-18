import { toDBString } from '@shinju-date/temporal-fns'
import mime from 'mime'
import { nanoid } from 'nanoid'
import type { TypedSupabaseClient, WriteContext } from '../../types.js'
import { DatabaseError } from '../errors.js'
import {
  createBlurDataURL,
  downloadImage,
  removeImage,
  removeStoredImages,
  storeImage,
} from '../images/index.js'

export const THUMBNAILS_BUCKET = 'thumbnails'

/** An image on the source platform to copy into our storage. */
export interface ThumbnailSource {
  height: number
  url: string
  width: number
}

export interface CreateThumbnailOptions {
  /**
   * The ETag of the image the video uses now. When given, the image is only
   * downloaded and stored if it changed since (see {@link createThumbnail}).
   */
  etag?: string | null
  /**
   * Folder the image is stored under. Use the platform video ID so stored
   * objects can be traced back to their video.
   */
  folder: string
  now: Temporal.Instant
  source: ThumbnailSource
  supabaseClient: TypedSupabaseClient
}

/** What {@link removeThumbnail} needs from the run. */
export type ThumbnailRemovalContext = Pick<
  WriteContext,
  'reportError' | 'supabaseClient'
>

/** A stored thumbnail: its `thumbnails` row ID and storage path. */
export interface Thumbnail {
  id: string
  path: string
}

/**
 * Copies an image into the thumbnails bucket and registers it in the
 * `thumbnails` table.
 *
 * With `etag`, the image is requested with `If-None-Match`, and nothing is
 * stored when the platform confirms it is unchanged (`304 Not Modified`, or
 * the same ETag again).
 *
 * @returns The stored thumbnail, or `null` when the image is unchanged.
 * @throws When the image cannot be downloaded, stored or registered. Nothing
 *   is left behind in that case.
 */
export async function createThumbnail({
  etag,
  folder,
  now,
  source,
  supabaseClient,
}: CreateThumbnailOptions): Promise<Thumbnail | null> {
  const downloaded = await downloadImage(source.url, { etag })

  if (!downloaded) {
    return null
  }

  const contentType = downloaded.contentType ?? 'image/jpeg'
  const image = downloaded.body
  // Decoding first means a broken image is rejected before anything is stored.
  const blurDataURL = await createBlurDataURL(image)
  const extension = mime.getExtension(contentType) ?? 'jpg'
  const thumbnail: Thumbnail = {
    id: crypto.randomUUID(),
    path: `${folder}/${nanoid()}.${extension}`,
  }

  await storeImage(supabaseClient, {
    bucket: THUMBNAILS_BUCKET,
    contentType,
    image,
    path: thumbnail.path,
  })

  const { error: insertError } = await supabaseClient
    .from('thumbnails')
    .insert({
      blur_data_url: blurDataURL,
      etag: downloaded.etag,
      height: source.height,
      id: thumbnail.id,
      path: thumbnail.path,
      updated_at: toDBString(now),
      width: source.width,
    })

  if (insertError) {
    await removeStoredImages(supabaseClient, {
      bucket: THUMBNAILS_BUCKET,
      paths: [thumbnail.path],
    }).catch(() => {
      // Ignored: the insert error is the one to throw, and an object without
      // its row is never served.
    })

    throw new DatabaseError('Failed to insert a thumbnail', insertError)
  }

  return thumbnail
}

/**
 * Removes a thumbnail that is no longer used: first its row, then its image.
 *
 * Best effort: a leftover thumbnail is never shown, so failures are reported
 * instead of thrown. The image is only removed once the row is gone, so a row
 * never points at a missing image.
 */
export async function removeThumbnail(
  { reportError, supabaseClient }: ThumbnailRemovalContext,
  thumbnail: Thumbnail,
): Promise<void> {
  try {
    const removed = await removeImage(supabaseClient, {
      bucket: THUMBNAILS_BUCKET,
      image: thumbnail,
      table: 'thumbnails',
    })

    if (!removed) {
      throw new Error(`The thumbnail is still used by a video: ${thumbnail.id}`)
    }
  } catch (error) {
    reportError(error, {
      thumbnailId: thumbnail.id,
      thumbnailPath: thumbnail.path,
    })
  }
}
