import type { Tables, TablesUpdate } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import { getTwitchVideoStatus } from '@shinju-date/twitch-api-client'
import {
  DEFAULT_THUMBNAIL_HEIGHT,
  DEFAULT_THUMBNAIL_WIDTH,
  resolveThumbnailTemplateUrl,
  type ThumbnailSource,
} from '../internal/thumbnails/index.js'
import type { TwitchClip, TwitchStream, TwitchVideo } from './types.js'

export type TwitchVideoType = NonNullable<Tables<'twitch_videos'>['type']>

/** The `videos` columns that mirror what Twitch reports for a video. */
export type TwitchVideoFields = Pick<
  Tables<'videos'>,
  'duration' | 'published_at' | 'status' | 'title'
>

/**
 * Maps a Helix video to the columns we keep in sync with Twitch.
 */
export function toVideoFields(video: TwitchVideo): TwitchVideoFields {
  return {
    duration: video.duration,
    published_at: toDBString(
      Temporal.Instant.from(video.published_at || video.created_at),
    ),
    status: getTwitchVideoStatus(video.type),
    title: video.title,
  }
}

/**
 * Maps a Helix clip to the columns we keep in sync with Twitch.
 */
export function toClipFields(clip: TwitchClip): TwitchVideoFields {
  return {
    duration: clip.duration,
    published_at: toDBString(Temporal.Instant.from(clip.created_at)),
    status: getTwitchVideoStatus('clip'),
    title: clip.title,
  }
}

/**
 * Maps a live stream to the columns of its `videos` row while it is on air.
 */
export function toLiveFields(stream: TwitchStream): TwitchVideoFields {
  return {
    duration: 'P0D',
    published_at: toDBString(Temporal.Instant.from(stream.started_at)),
    status: 'LIVE',
    title: stream.title,
  }
}

function isSameInstant(a: string, b: string): boolean {
  return (
    toDBString(Temporal.Instant.from(a)) ===
    toDBString(Temporal.Instant.from(b))
  )
}

/**
 * Compares a saved video with what Twitch reports now.
 *
 * @returns The columns that changed, or `null` when the video is up to date.
 */
export function getVideoChanges(
  saved: TwitchVideoFields,
  next: TwitchVideoFields,
): TablesUpdate<'videos'> | null {
  const changes: TablesUpdate<'videos'> = {}

  if (saved.duration !== next.duration) {
    changes.duration = next.duration
  }

  if (!isSameInstant(saved.published_at, next.published_at)) {
    changes.published_at = next.published_at
  }

  if (saved.status !== next.status) {
    changes.status = next.status
  }

  if (saved.title !== next.title) {
    changes.title = next.title
  }

  return Object.keys(changes).length > 0 ? changes : null
}

/**
 * Twitch serves this placeholder while a VOD's own thumbnail is still being
 * generated.
 */
const PROCESSING_THUMBNAIL_PATTERN = /\/_404\/404_processing_/

/**
 * Turns a Twitch thumbnail template URL into a downloadable image.
 *
 * Returns `null` while Twitch has no real thumbnail yet: the URL of a VOD is
 * empty during the broadcast and points to a "processing" placeholder right
 * after it, and neither should be stored as the video's thumbnail.
 */
export function getThumbnailSource(
  templateUrl: string,
): ThumbnailSource | null {
  if (!templateUrl || PROCESSING_THUMBNAIL_PATTERN.test(templateUrl)) {
    return null
  }

  return {
    height: DEFAULT_THUMBNAIL_HEIGHT,
    url: resolveThumbnailTemplateUrl(templateUrl),
    width: DEFAULT_THUMBNAIL_WIDTH,
  }
}
