import type { TablesUpdate } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import type { WriteContext } from '../../types.js'
import { updateVideo } from '../database/videos.js'
import { removeThumbnail, type Thumbnail } from './thumbnail.js'

export interface ReplaceThumbnailOptions {
  /**
   * Stores the new thumbnail, or returns `null` when there is none to store.
   * Only called once, before the video is updated.
   */
  create: () => Promise<Thumbnail | null>
  /** Other columns to update along with the thumbnail. */
  fields: Omit<TablesUpdate<'videos'>, 'thumbnail_id' | 'updated_at'>
  /** The thumbnail the video uses now, if any; removed once it is replaced. */
  previous: Thumbnail | null
  videoId: string
}

/**
 * Points a video at a new thumbnail and removes the one it used before, so a
 * replaced thumbnail is not left behind.
 *
 * When no new thumbnail is stored, only `fields` are updated (nothing is
 * written when they are empty) and the video keeps its thumbnail. Every
 * update also sets `updated_at` to the time of the run.
 *
 * @returns The new thumbnail, or `null` when none was stored.
 * @throws When the video cannot be updated. The new thumbnail is removed
 *   then, and the video keeps its current one.
 */
export async function replaceThumbnail(
  context: WriteContext,
  { create, fields, previous, videoId }: ReplaceThumbnailOptions,
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
    await updateVideo(supabaseClient, videoId, {
      ...fields,
      thumbnail_id: thumbnail.id,
      updated_at: updatedAt,
    })
  } catch (error) {
    await removeThumbnail(context, thumbnail)

    throw error
  }

  if (previous) {
    await removeThumbnail(context, previous)
  }

  return thumbnail
}
