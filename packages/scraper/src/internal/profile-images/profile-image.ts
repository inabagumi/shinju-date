import { createHash } from 'node:crypto'
import {
  PROFILE_IMAGE_SIZE,
  PROFILE_IMAGES_BUCKET,
} from '@shinju-date/constants'
import retryableFetch from '@shinju-date/retryable-fetch'
import { toDBString } from '@shinju-date/temporal-fns'
import { nanoid } from 'nanoid'
import sharp from 'sharp'
import type { Temporal } from 'temporal-polyfill'
import type { TypedSupabaseClient } from '../../types.js'
import { DatabaseError } from '../database/errors.js'

/** One year: stored objects are immutable because every upload gets a new path. */
const CACHE_CONTROL_MAX_AGE_SECONDS = 365 * 24 * 60 * 60

const CONTENT_TYPE = 'image/webp'
const EXTENSION = 'webp'

/** The account a profile image belongs to. */
export interface ProfileImageOwner {
  /** Row ID in `youtube_channels` or `twitch_users`. */
  id: string
  platform: 'twitch' | 'youtube'
  /**
   * The account ID on the platform (YouTube channel ID or Twitch user ID).
   * Used as the storage folder so objects can be traced back to the account.
   */
  platformId: string
}

/** A stored profile image: its `profile_images` row. */
export interface ProfileImage {
  etag: string | null
  id: string
  path: string
}

export interface SyncProfileImageOptions {
  /** The image the account has now, if any. */
  current: ProfileImage | null
  now: Temporal.Instant
  owner: ProfileImageOwner
  /** URL of the icon on the platform. */
  sourceUrl: string
  supabaseClient: TypedSupabaseClient
}

export type SyncProfileImageResult =
  | { image: ProfileImage; status: 'created' | 'replaced' }
  | { image: ProfileImage; status: 'unchanged' }

interface DownloadedImage {
  body: ArrayBuffer
  etag: string
}

interface ProcessedImage {
  blurDataURL: string
  data: Buffer
  size: number
}

/**
 * Stand-in for a missing `ETag` header so unchanged icons can still be
 * recognized. Weak, because it is not what the source server would send.
 */
function createDigestETag(body: ArrayBuffer): string {
  const digest = createHash('sha256').update(new Uint8Array(body)).digest('hex')

  return `W/"sha256-${digest}"`
}

/**
 * Downloads the icon unless it still matches `etag`.
 *
 * @returns `null` when the source reports the icon has not changed.
 */
async function downloadImage(
  url: string,
  etag: string | null,
): Promise<DownloadedImage | null> {
  const response = await retryableFetch(
    url,
    etag ? { headers: { 'If-None-Match': etag } } : {},
  )

  if (response.status === 304) {
    return null
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  const body = await response.arrayBuffer()

  if (!contentType.startsWith('image/')) {
    throw new TypeError(
      `Expected an image but received "${contentType}": ${url}`,
    )
  }

  return {
    body,
    etag: response.headers.get('ETag') ?? createDigestETag(body),
  }
}

/**
 * Crops an image to a centered square no larger than `PROFILE_IMAGE_SIZE`, so
 * it can be shown in a circle without distortion.
 */
async function processImage(input: ArrayBuffer): Promise<ProcessedImage> {
  const { height, width } = await sharp(input).metadata()

  if (!width || !height) {
    throw new TypeError('The image has no dimensions')
  }

  const edge = Math.min(width, height, PROFILE_IMAGE_SIZE)
  const { data, info } = await sharp(input)
    .rotate()
    .resize(edge, edge, { fit: 'cover', position: 'centre' })
    .webp()
    .toBuffer({ resolveWithObject: true })
  const blur = await sharp(data).resize(10, 10).webp().toBuffer()

  return {
    blurDataURL: `data:image/webp;base64,${blur.toString('base64')}`,
    data,
    size: info.width,
  }
}

async function removeObject(
  supabaseClient: TypedSupabaseClient,
  path: string,
): Promise<void> {
  try {
    await supabaseClient.storage.from(PROFILE_IMAGES_BUCKET).remove([path])
  } catch {
    // Best effort: an unreferenced object is never served (only paths stored
    // in `profile_images` are), so a leftover is harmless.
  }
}

/**
 * Makes the stored profile image of an account match its icon on the
 * platform.
 *
 * - Nothing is uploaded when the icon is unchanged: the stored `etag` is sent
 *   as `If-None-Match` and also compared with the downloaded one.
 * - A new icon is uploaded under a new path, then the row is created, or
 *   updated in place so that it stays linked to the account. The previous
 *   object is removed only after the row points at the new one.
 *
 * @throws When the icon cannot be downloaded, processed, stored or
 *   registered. The account keeps its current image in that case and no new
 *   object is left behind.
 */
export async function syncProfileImage({
  current,
  now,
  owner,
  sourceUrl,
  supabaseClient,
}: SyncProfileImageOptions): Promise<SyncProfileImageResult> {
  const downloaded = await downloadImage(sourceUrl, current?.etag ?? null)

  if (current && (!downloaded || downloaded.etag === current.etag)) {
    return { image: current, status: 'unchanged' }
  }

  if (!downloaded) {
    // A 304 without anything to compare against: the server misbehaved.
    throw new TypeError(`Unexpected "304 Not Modified": ${sourceUrl}`)
  }

  // Decoding first means a broken image is rejected before anything is stored.
  const processed = await processImage(downloaded.body)
  const path = `${owner.platform}/${owner.platformId}/${nanoid()}.${EXTENSION}`

  const { error: uploadError } = await supabaseClient.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(path, processed.data, {
      cacheControl: CACHE_CONTROL_MAX_AGE_SECONDS.toString(10),
      contentType: CONTENT_TYPE,
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const values = {
    blur_data_url: processed.blurDataURL,
    etag: downloaded.etag,
    height: processed.size,
    path,
    updated_at: toDBString(now),
    width: processed.size,
  }

  if (!current) {
    const id = crypto.randomUUID()
    const { error } = await supabaseClient.from('profile_images').insert({
      ...values,
      id,
      twitch_user_id: owner.platform === 'twitch' ? owner.id : null,
      youtube_channel_id: owner.platform === 'youtube' ? owner.id : null,
    })

    if (error) {
      await removeObject(supabaseClient, path)

      throw new DatabaseError('Failed to insert a profile image', error)
    }

    return { image: { etag: values.etag, id, path }, status: 'created' }
  }

  // Matching the old path as well means a concurrent replacement is not
  // silently overwritten (its object would otherwise never be removed).
  const { data, error } = await supabaseClient
    .from('profile_images')
    .update(values)
    .eq('id', current.id)
    .eq('path', current.path)
    .select('id')

  if (error || !data || data.length === 0) {
    await removeObject(supabaseClient, path)

    throw new DatabaseError('Failed to replace a profile image', {
      message: error?.message ?? 'the image was changed or removed meanwhile',
      ...(error?.code ? { code: error.code } : {}),
    })
  }

  await removeObject(supabaseClient, current.path)

  return {
    image: { etag: values.etag, id: current.id, path },
    status: 'replaced',
  }
}

/**
 * Removes the profile image of an account, e.g. when the platform no longer
 * has an icon for it. The row is deleted first so the image stops being
 * served even if removing the object fails.
 *
 * @throws When the row cannot be deleted.
 */
export async function removeProfileImage(
  supabaseClient: TypedSupabaseClient,
  image: Pick<ProfileImage, 'id' | 'path'>,
): Promise<void> {
  const { error } = await supabaseClient
    .from('profile_images')
    .delete()
    .eq('id', image.id)

  if (error) {
    throw new DatabaseError('Failed to delete a profile image', error)
  }

  await removeObject(supabaseClient, image.path)
}
