import type { TypedSupabaseClient } from '../../types.js'
import {
  DatabaseError,
  isForeignKeyViolation,
  StorageError,
} from '../errors.js'

/**
 * `Cache-Control` of stored images, in seconds: one year. Stored objects are
 * immutable because every upload gets a new path.
 */
export const IMAGE_CACHE_CONTROL = (365 * 24 * 60 * 60).toString(10)

/** Tables whose rows each describe one stored image. */
export type ImageTable = 'profile_images' | 'thumbnails'

export interface StoreImageOptions {
  bucket: string
  contentType: string
  image: ArrayBuffer | Uint8Array
  /** A new path: stored objects are never overwritten. */
  path: string
}

/**
 * Uploads an image to a storage bucket. Register it in its table afterwards,
 * and call {@link removeStoredImages} when that fails.
 *
 * @throws {StorageError} When the image cannot be uploaded.
 */
export async function storeImage(
  supabaseClient: TypedSupabaseClient,
  { bucket, contentType, image, path }: StoreImageOptions,
): Promise<void> {
  const { error } = await supabaseClient.storage
    .from(bucket)
    .upload(path, image, {
      cacheControl: IMAGE_CACHE_CONTROL,
      contentType,
      upsert: false,
    })

  if (error) {
    throw new StorageError(`Failed to upload an image to ${bucket}`, error)
  }
}

export interface RemoveStoredImagesOptions {
  bucket: string
  paths: readonly string[]
}

/**
 * Removes images from a storage bucket.
 *
 * @throws {StorageError} When the images cannot be removed.
 */
export async function removeStoredImages(
  supabaseClient: TypedSupabaseClient,
  { bucket, paths }: RemoveStoredImagesOptions,
): Promise<void> {
  const { error } = await supabaseClient.storage.from(bucket).remove([...paths])

  if (error) {
    throw new StorageError(`Failed to remove images from ${bucket}`, error)
  }
}

export interface RemoveImageOptions {
  bucket: string
  image: { id: string; path: string }
  table: ImageTable
}

/**
 * Deletes an image that is believed to be unused: first its row, then its
 * object.
 *
 * The database refuses to delete a row that is still used, and the object is
 * only removed once the row is gone, so a used image never loses its object.
 *
 * @returns Whether the image was deleted (`false` when it is still used).
 * @throws {DatabaseError} When the row cannot be deleted for another reason.
 * @throws {StorageError} When the object cannot be removed. The row is gone
 *   by then, so the object is never served.
 */
export async function removeImage(
  supabaseClient: TypedSupabaseClient,
  { bucket, image, table }: RemoveImageOptions,
): Promise<boolean> {
  const { error } = await supabaseClient.from(table).delete().eq('id', image.id)

  if (error) {
    if (isForeignKeyViolation(error)) {
      return false
    }

    throw new DatabaseError(`Failed to delete an image from ${table}`, error)
  }

  await removeStoredImages(supabaseClient, { bucket, paths: [image.path] })

  return true
}
