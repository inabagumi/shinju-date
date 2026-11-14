import { toDBString } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import type { TypedSupabaseClient } from '../../types.js'
import { DatabaseError } from '../database/errors.js'
import { removeProfileImage } from './profile-image.js'

/**
 * Icons younger than this are left alone: `syncProfileImage` stores an icon
 * before assigning it, so a fresh icon may simply not be assigned yet.
 */
export const UNUSED_PROFILE_IMAGE_GRACE_PERIOD = Temporal.Duration.from({
  hours: 1,
})

export interface RemoveUnusedProfileImagesOptions {
  now: Temporal.Instant
}

/**
 * Deletes icons that no YouTube channel or Twitch user uses any more, e.g.
 * because their channel was deleted or discarding a replaced icon failed.
 *
 * Safe to run at any time: an icon that becomes used again in the meantime is
 * refused by the database and kept.
 *
 * @returns The number of icons deleted.
 * @throws When unused icons cannot be listed or deleted.
 */
export async function removeUnusedProfileImages(
  supabaseClient: TypedSupabaseClient,
  { now }: RemoveUnusedProfileImagesOptions,
): Promise<number> {
  const before = now.subtract(UNUSED_PROFILE_IMAGE_GRACE_PERIOD)
  const { data, error } = await supabaseClient
    .from('profile_images')
    .select('id, path, youtube_channels(id), twitch_users(id)')
    // Filtering an embedded resource on null keeps the rows without one.
    .is('youtube_channels', null)
    .is('twitch_users', null)
    .lt('created_at', toDBString(before))

  if (error) {
    throw new DatabaseError('Failed to list unused profile images', error)
  }

  let removedCount = 0

  for (const image of data) {
    if (await removeProfileImage(supabaseClient, image)) {
      removedCount += 1
    }
  }

  return removedCount
}
