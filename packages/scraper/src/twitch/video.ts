import type { Tables } from "@shinju-date/database";
import { toDBString } from "@shinju-date/temporal-fns";
import { getTwitchVideoStatus } from "@shinju-date/twitch-api-client";

import {
  DEFAULT_THUMBNAIL_HEIGHT,
  DEFAULT_THUMBNAIL_WIDTH,
  resolveThumbnailTemplateUrl,
} from "../internal/thumbnails/index.js";
import type { ThumbnailSource } from "../internal/thumbnails/index.js";
import type { VideoFields } from "../types.js";
import type { TwitchClip, TwitchStream, TwitchVideo } from "./types.js";

export type TwitchVideoType = NonNullable<Tables<"twitch_videos">["type"]>;

/** The `videos` columns that mirror what Twitch reports for a video. */
export type TwitchVideoFields = VideoFields;

/** The `video_kind` of each `twitch_videos.type`. */
const VIDEO_KIND_BY_TYPE = {
  archive: "stream",
  clip: "short",
  highlight: "standard",
  upload: "standard",
} as const satisfies Record<TwitchVideoType, VideoFields["video_kind"]>;

/**
 * The `video_kind` of a Twitch video, from its `twitch_videos.type`:
 *
 * - `stream`: a broadcast, i.e. an archive, or a placeholder (`null`) that
 *   stands in for a broadcast whose archive is unknown
 * - `standard`: a highlight or an upload
 * - `short`: a clip
 */
export const getTwitchVideoKind = (
  type: TwitchVideoType | null
): VideoFields["video_kind"] =>
  type === null ? "stream" : VIDEO_KIND_BY_TYPE[type];

/**
 * Maps a Helix video to the columns we keep in sync with Twitch.
 */
export const toVideoFields = (video: TwitchVideo): TwitchVideoFields => ({
  duration: video.duration,
  published_at: toDBString(
    Temporal.Instant.from(video.published_at || video.created_at)
  ),
  status: getTwitchVideoStatus(video.type),
  title: video.title,
  video_kind: getTwitchVideoKind(video.type),
});

/**
 * Maps a Helix clip to the columns we keep in sync with Twitch.
 */
export const toClipFields = (clip: TwitchClip): TwitchVideoFields => ({
  duration: clip.duration,
  published_at: toDBString(Temporal.Instant.from(clip.created_at)),
  status: getTwitchVideoStatus("clip"),
  title: clip.title,
  video_kind: getTwitchVideoKind("clip"),
});

/**
 * Maps a live stream to the columns of its `videos` row while it is on air.
 */
export const toLiveFields = (stream: TwitchStream): TwitchVideoFields => ({
  duration: "P0D",
  published_at: toDBString(Temporal.Instant.from(stream.started_at)),
  status: "LIVE",
  title: stream.title,
  video_kind: getTwitchVideoKind(null),
});

/**
 * Twitch serves this placeholder while a VOD's own thumbnail is still being
 * generated.
 */
const PROCESSING_THUMBNAIL_PATTERN = /\/_404\/404_processing_/u;

/**
 * Turns a Twitch thumbnail template URL into a downloadable image.
 *
 * Returns `null` while Twitch has no real thumbnail yet: the URL of a VOD is
 * empty during the broadcast and points to a "processing" placeholder right
 * after it, and neither should be stored as the video's thumbnail.
 */
export const getThumbnailSource = (
  templateUrl: string
): ThumbnailSource | null => {
  if (!templateUrl || PROCESSING_THUMBNAIL_PATTERN.test(templateUrl)) {
    return null;
  }

  return {
    height: DEFAULT_THUMBNAIL_HEIGHT,
    url: resolveThumbnailTemplateUrl(templateUrl),
    width: DEFAULT_THUMBNAIL_WIDTH,
  };
};
