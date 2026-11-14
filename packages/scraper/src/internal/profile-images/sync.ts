import type { TypedSupabaseClient } from '../../types.js'
import { DatabaseError } from '../database/errors.js'
import {
  createProfileImage,
  downloadProfileImage,
  type ProfileImageOwner,
  removeProfileImage,
  type StoredProfileImage,
} from './profile-image.js'

/**
 * What {@link syncProfileImage} did:
 *
 * - `created`: the owner had no icon and got one
 * - `replaced`: the owner's icon changed and the old one was discarded
 * - `removed`: the platform has no icon any more, so the owner's was discarded
 * - `unchanged`: nothing was written
 */
export type ProfileImageSyncResult =
  | 'created'
  | 'removed'
  | 'replaced'
  | 'unchanged'

export interface SyncProfileImageOptions {
  now: Temporal.Instant
  owner: ProfileImageOwner
  /** The owner's current icon, if any. */
  saved: StoredProfileImage | null
  /** URL of the icon on the platform, or `null` when it has none. */
  sourceUrl: string | null
  supabaseClient: TypedSupabaseClient
}

/**
 * Points a channel or user at an icon (or at none).
 *
 * @throws When the owner cannot be updated or no longer exists.
 */
async function assignProfileImage(
  supabaseClient: TypedSupabaseClient,
  owner: ProfileImageOwner,
  profileImageId: string | null,
): Promise<void> {
  const values = { profile_image_id: profileImageId }
  const { data, error } =
    owner.platform === 'youtube'
      ? await supabaseClient
          .from('youtube_channels')
          .update(values)
          .eq('id', owner.id)
          .select('id')
      : await supabaseClient
          .from('twitch_users')
          .update(values)
          .eq('id', owner.id)
          .select('id')

  if (error) {
    throw new DatabaseError('Failed to assign a profile image', error)
  }

  if (data.length === 0) {
    throw new Error(
      `The ${owner.platform} account to assign a profile image to was not found: ${owner.id}`,
    )
  }
}

/**
 * Discards an icon its owner no longer uses. Best effort: an icon left behind
 * is unused and is picked up by `removeUnusedProfileImages` later.
 */
async function discardProfileImage(
  supabaseClient: TypedSupabaseClient,
  image: StoredProfileImage,
): Promise<void> {
  try {
    await removeProfileImage(supabaseClient, image)
  } catch {
    // Ignored on purpose, see above.
  }
}

/**
 * Brings the icon of a YouTube channel or Twitch user in line with its
 * platform.
 *
 * An unchanged icon is neither downloaded nor uploaded again (see
 * `downloadProfileImage`). A changed icon is stored under a new path and
 * assigned to its owner before the old one is discarded, so the owner always
 * points at an icon that exists.
 *
 * @throws When the icon cannot be downloaded, stored or assigned. The owner
 *   keeps its current icon then, and nothing new is left behind.
 */
export async function syncProfileImage({
  now,
  owner,
  saved,
  sourceUrl,
  supabaseClient,
}: SyncProfileImageOptions): Promise<ProfileImageSyncResult> {
  if (!sourceUrl) {
    if (!saved) {
      return 'unchanged'
    }

    await assignProfileImage(supabaseClient, owner, null)
    await discardProfileImage(supabaseClient, saved)

    return 'removed'
  }

  const downloaded = await downloadProfileImage(sourceUrl, saved)

  if (!downloaded) {
    return 'unchanged'
  }

  const created = await createProfileImage({
    image: downloaded,
    now,
    owner,
    supabaseClient,
  })

  try {
    await assignProfileImage(supabaseClient, owner, created.id)
  } catch (error) {
    await discardProfileImage(supabaseClient, created)

    throw error
  }

  if (!saved) {
    return 'created'
  }

  await discardProfileImage(supabaseClient, saved)

  return 'replaced'
}
