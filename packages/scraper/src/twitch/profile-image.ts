import {
  type ProfileImageSyncResult,
  type SavedProfileImageRow,
  syncProfileImage,
  toStoredProfileImage,
} from '../internal/profile-images/index.js'
import type { TypedSupabaseClient } from '../types.js'
import type { TwitchUser } from './types.js'

/**
 * Twitch serves the icons it gives users without one of their own from
 * directories such as `/user-default-pictures-uv/`.
 */
const DEFAULT_PICTURE_DIRECTORY_PREFIX = 'user-default-pictures'

/**
 * Picks the URL of a user icon to store from `profile_image_url`.
 *
 * The URL is used as is: Twitch returns a 300x300 icon, which is larger than
 * the stored size already.
 *
 * @returns `null` when the user has no icon of their own: the URL is empty,
 *   not HTTPS, or one of Twitch's default icons. The app shows its own
 *   default icon then.
 */
export function selectTwitchUserIconUrl(
  profileImageUrl: string | null | undefined,
): string | null {
  const value = profileImageUrl?.trim()

  if (!value || !URL.canParse(value)) {
    return null
  }

  const url = new URL(value)
  const directory = url.pathname.split('/')[1] ?? ''

  if (
    url.protocol !== 'https:' ||
    directory.startsWith(DEFAULT_PICTURE_DIRECTORY_PREFIX)
  ) {
    return null
  }

  return value
}

/**
 * A row of `twitch_users` with its icon, selected with
 * `id, twitch_user_id, profile_images(id, path, etag, source_url)`.
 */
export interface SavedTwitchUserIcon {
  /** `twitch_users.id`. */
  id: string
  profile_images: SavedProfileImageRow | null
  twitch_user_id: string
}

export interface SyncTwitchUserIconOptions {
  now?: Temporal.Instant
  /** The saved user the icon belongs to. */
  saved: SavedTwitchUserIcon
  /**
   * A client with the service role: icons can only be written with it.
   */
  supabaseClient: TypedSupabaseClient
  /** The user as returned by the Helix API. */
  user: Pick<TwitchUser, 'profile_image_url'>
}

/**
 * Brings the stored icon of a Twitch user in line with Twitch.
 *
 * The icon is only downloaded and stored again when it changed on Twitch
 * (see `syncProfileImage`). A user who went back to a default icon loses
 * the stored one.
 *
 * @throws When the icon cannot be downloaded, stored or assigned. The user
 *   keeps its current icon then.
 */
export function syncTwitchUserIcon({
  now = Temporal.Now.instant(),
  saved,
  supabaseClient,
  user,
}: SyncTwitchUserIconOptions): Promise<ProfileImageSyncResult> {
  return syncProfileImage({
    now,
    owner: {
      id: saved.id,
      platform: 'twitch',
      platformId: saved.twitch_user_id,
    },
    saved: toStoredProfileImage(saved.profile_images),
    sourceUrl: selectTwitchUserIconUrl(user.profile_image_url),
    supabaseClient,
  })
}
