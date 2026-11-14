import type { Tables, TablesUpdate } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import {
  getPublishedAt,
  getVideoKind,
  getVideoStatus,
} from '@shinju-date/youtube-api-client'
import type { ThumbnailSource } from '../internal/thumbnails/index.js'
import type { YouTubeVideo } from './types.js'

/** The `videos` columns that mirror what YouTube reports for a video. */
export type YouTubeVideoFields = Pick<
  Tables<'videos'>,
  'duration' | 'published_at' | 'status' | 'title' | 'video_kind'
>

/**
 * Maps a YouTube video to the columns we keep in sync with YouTube.
 */
export function toVideoFields(
  video: YouTubeVideo,
  now: Temporal.Instant,
): YouTubeVideoFields {
  const publishedAt =
    getPublishedAt(video) ?? Temporal.Instant.from(video.snippet.publishedAt)

  return {
    duration: video.contentDetails.duration ?? 'P0D',
    published_at: toDBString(publishedAt),
    status: getVideoStatus(video, now),
    title: video.snippet.title ?? '',
    video_kind: getVideoKind(video),
  }
}

function isSameInstant(a: string, b: string): boolean {
  return (
    toDBString(Temporal.Instant.from(a)) ===
    toDBString(Temporal.Instant.from(b))
  )
}

/**
 * Compares a saved video with what YouTube reports now.
 *
 * @returns The columns that changed, or `null` when the video is up to date.
 */
export function getVideoChanges(
  saved: YouTubeVideoFields,
  video: YouTubeVideo,
  now: Temporal.Instant,
): TablesUpdate<'videos'> | null {
  const next = toVideoFields(video, now)
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

  if (saved.video_kind !== next.video_kind) {
    changes.video_kind = next.video_kind
  }

  return Object.keys(changes).length > 0 ? changes : null
}

/**
 * Picks the best thumbnail YouTube offers for a video, if any.
 */
export function getThumbnailSource(
  video: YouTubeVideo,
): ThumbnailSource | null {
  const thumbnails = video.snippet.thumbnails
  const thumbnail =
    thumbnails?.maxres ?? thumbnails?.standard ?? thumbnails?.high

  if (!thumbnail?.url || !thumbnail.width || !thumbnail.height) {
    return null
  }

  return {
    height: thumbnail.height,
    url: thumbnail.url,
    width: thumbnail.width,
  }
}
