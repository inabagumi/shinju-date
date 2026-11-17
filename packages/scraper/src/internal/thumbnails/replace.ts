import type { TablesUpdate } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import type { TypedSupabaseClient, WriteContext } from '../../types.js'
import { updateVideo } from '../database/videos.js'
import { DatabaseError } from '../errors.js'
import { removeThumbnail, type Thumbnail } from './thumbnail.js'

export interface ReplaceThumbnailOptions {
  /**
   * Stores the new thumbnail, or returns `null` when there is none to store.
   * Only called once, before the video is updated.
   */
  create: () => Promise<Thumbnail | null>
  /** Other columns to update along with the thumbnail. */
  fields: Omit<TablesUpdate<'videos'>, 'thumbnail_id' | 'updated_at'>
  /** The thumbnail the video uses now (`videos.thumbnail_id`), if any. */
  previousThumbnailId: string | null
  videoId: string
}

/**
 * Marks a thumbnail as unused from `updatedAt` on, so that the cleanup of
 * unused thumbnails keeps it for its grace period from then.
 */
async function touchThumbnail(
  supabaseClient: TypedSupabaseClient,
  thumbnailId: string,
  updatedAt: string,
): Promise<void> {
  const { error } = await supabaseClient
    .from('thumbnails')
    .update({ updated_at: updatedAt })
    .eq('id', thumbnailId)

  if (error) {
    throw new DatabaseError('Failed to update a replaced thumbnail', error)
  }
}

/**
 * Points a video at a new thumbnail.
 *
 * The thumbnail the video used before is left in place: pages the public site
 * cached before the update still show its image, so it is only removed later
 * by `removeUnusedThumbnails`. Its `updated_at` is set to the time of the run,
 * from which that cleanup counts its grace period.
 *
 * When no new thumbnail is stored, only `fields` are updated (nothing is
 * written when they are empty) and the video keeps its thumbnail. Every
 * update also sets `updated_at` to the time of the run.
 *
 * @returns The new thumbnail, or `null` when none was stored.
 * @throws When the video (or the previous thumbnail) cannot be updated. The
 *   new thumbnail is removed then, and the video keeps its current one.
 */
export async function replaceThumbnail(
  context: WriteContext,
  { create, fields, previousThumbnailId, videoId }: ReplaceThumbnailOptions,
): Promise<Thumbnail | null> {
  const { now, supabaseClient } = context
  const updatedAt = toDBString(now)
  const thumbnail = await create()

  if (!thumbnail) {
    if (Object.keys(fields).length > 0) {
      await updateVideo(supabaseClient, videoId, {
        ...fields,
        updated_at: updatedAt,
      })
    }

    return null
  }

  try {
    // Before the video: should this fail, nothing has changed yet, and should
    // the video fail, the previous thumbnail is merely kept a little longer.
    if (previousThumbnailId && previousThumbnailId !== thumbnail.id) {
      await touchThumbnail(supabaseClient, previousThumbnailId, updatedAt)
    }

    await updateVideo(supabaseClient, videoId, {
      ...fields,
      thumbnail_id: thumbnail.id,
      updated_at: updatedAt,
    })
  } catch (error) {
    await removeThumbnail(context, thumbnail)

    throw error
  }

  return thumbnail
}
