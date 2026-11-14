import type { youtube_v3 as youtube } from '@googleapis/youtube'
import { Temporal } from 'temporal-polyfill'
import {
  MAX_PROFILE_IMAGE_SIZE,
  type ProfileImageSyncResult,
  type SavedProfileImageRow,
  syncProfileImage,
  toStoredProfileImage,
} from '../internal/profile-images/index.js'
import type { TypedSupabaseClient } from '../types.js'
import type { YouTubeChannel } from './types.js'

/** The sizes YouTube may offer, roughly from smallest to largest. */
const THUMBNAIL_KEYS = [
  'default',
  'medium',
  'high',
  'standard',
  'maxres',
] as const satisfies readonly (keyof youtube.Schema$ThumbnailDetails)[]

interface IconCandidate {
  height: number
  url: string
  width: number
}

function isHttpsUrl(value: string): boolean {
  return URL.canParse(value) && new URL(value).protocol === 'https:'
}

/**
 * Picks the URL of a channel icon to store from `snippet.thumbnails`.
 *
 * The smallest square candidate that is at least
 * {@link MAX_PROFILE_IMAGE_SIZE} wide is preferred, so the stored icon is as
 * sharp as it can be without downloading more than needed. When none is that
 * large, the largest square one is used. When YouTube states no square size
 * at all, the largest candidate is used: stored icons are cropped to a square
 * anyway.
 *
 * @returns `null` when the channel has no icon.
 */
export function selectYouTubeChannelIconUrl(
  thumbnails: youtube.Schema$ThumbnailDetails | null | undefined,
): string | null {
  const candidates: IconCandidate[] = THUMBNAIL_KEYS.flatMap((key) => {
    const thumbnail = thumbnails?.[key]
    const url = thumbnail?.url

    return url && isHttpsUrl(url)
      ? [{ height: thumbnail.height ?? 0, url, width: thumbnail.width ?? 0 }]
      : []
  })

  const squares = candidates
    .filter(({ height, width }) => width > 0 && width === height)
    .sort((a, b) => a.width - b.width)
  const square =
    squares.find(({ width }) => width >= MAX_PROFILE_IMAGE_SIZE) ??
    squares.at(-1)

  if (square) {
    return square.url
  }

  // Later keys are larger sizes, so they win ties between unknown sizes.
  const largest = candidates.reduce<IconCandidate | undefined>(
    (current, candidate) =>
      !current ||
      Math.min(candidate.width, candidate.height) >=
        Math.min(current.width, current.height)
        ? candidate
        : current,
    undefined,
  )

  return largest?.url ?? null
}

export type { SavedProfileImageRow }

/**
 * A row of `youtube_channels` with its icon, selected with
 * `id, youtube_channel_id, profile_images(id, path, etag, source_url)`.
 */
export interface SavedYouTubeChannelIcon {
  /** `youtube_channels.id`. */
  id: string
  profile_images: SavedProfileImageRow | null
  youtube_channel_id: string
}

export interface SyncYouTubeChannelIconOptions {
  /** The channel as returned by the YouTube Data API (`part=snippet`). */
  channel: Pick<YouTubeChannel, 'snippet'>
  now?: Temporal.Instant
  /** The saved channel the icon belongs to. */
  saved: SavedYouTubeChannelIcon
  /**
   * A client with the service role: icons can only be written with it.
   */
  supabaseClient: TypedSupabaseClient
}

/**
 * Brings the stored icon of a YouTube channel in line with YouTube.
 *
 * The icon is only downloaded and stored again when it changed on YouTube
 * (see `syncProfileImage`).
 *
 * @throws When the icon cannot be downloaded, stored or assigned. The channel
 *   keeps its current icon then.
 */
export function syncYouTubeChannelIcon({
  channel,
  now = Temporal.Now.instant(),
  saved,
  supabaseClient,
}: SyncYouTubeChannelIconOptions): Promise<ProfileImageSyncResult> {
  return syncProfileImage({
    now,
    owner: {
      id: saved.id,
      platform: 'youtube',
      platformId: saved.youtube_channel_id,
    },
    saved: toStoredProfileImage(saved.profile_images),
    sourceUrl: selectYouTubeChannelIconUrl(channel.snippet.thumbnails),
    supabaseClient,
  })
}
