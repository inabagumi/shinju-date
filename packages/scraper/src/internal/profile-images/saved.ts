import type { StoredProfileImage } from './profile-image.js'

/**
 * A row of `profile_images`, as embedded in a `youtube_channels` or
 * `twitch_users` row with `profile_images(id, path, etag, source_url)`.
 */
export interface SavedProfileImageRow {
  etag: string | null
  id: string
  path: string
  source_url: string
}

/** Turns an embedded `profile_images` row into what `syncProfileImage` takes. */
export function toStoredProfileImage(
  row: SavedProfileImageRow | null,
): StoredProfileImage | null {
  return row
    ? { etag: row.etag, id: row.id, path: row.path, sourceUrl: row.source_url }
    : null
}
