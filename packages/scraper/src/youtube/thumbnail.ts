import type { Enums } from "@shinju-date/database";

import {
  createThumbnail,
  replaceThumbnail,
} from "../internal/thumbnails/index.js";
import type { Thumbnail } from "../internal/thumbnails/index.js";
import type { WriteContext } from "../types.js";
import type { SavedYouTubeVideo } from "./saved-video.js";
import type { YouTubeVideo } from "./types.js";
import { getThumbnailSource, toVideoFields } from "./video.js";

/**
 * Statuses of videos whose thumbnail is checked for a replacement: streamers
 * may replace the thumbnail of a stream until it starts, or while it is live.
 * The thumbnails of finished streams and uploads hardly ever change.
 */
const REPLACEABLE_THUMBNAIL_STATUSES: ReadonlySet<Enums<"video_status">> =
  new Set(["LIVE", "UPCOMING"]);

/**
 * Stores the thumbnail of a video. With `etag` (the ETag of the thumbnail the
 * video uses now), nothing is stored when the image is unchanged.
 *
 * A failure is reported instead of thrown: a video without a new thumbnail
 * is still worth listing, and the next refresh tries again.
 *
 * @returns The stored thumbnail, or `null` when there is none to store.
 */
export const createYouTubeThumbnail = async (
  { now, reportError, supabaseClient }: WriteContext,
  video: YouTubeVideo,
  etag: string | null = null
): Promise<Thumbnail | null> => {
  const source = getThumbnailSource(video);

  if (!source) {
    return null;
  }

  try {
    return await createThumbnail({
      etag,
      folder: video.id,
      now,
      source,
      supabaseClient,
    });
  } catch (error) {
    reportError(error, { youtubeVideoId: video.id });

    return null;
  }
};

/**
 * Keeps the thumbnail of a saved video in line with YouTube:
 *
 * - a video without a thumbnail (e.g. its download failed when it was saved)
 *   gets one
 * - a scheduled or live video gets the new image when the streamer replaced
 *   it, which is told by the ETag of the stored image
 *
 * The replaced thumbnail is left for the cleanup of unused thumbnails (see
 * `replaceThumbnail`).
 *
 * @returns Whether the video got a new thumbnail.
 */
export const refreshYouTubeThumbnail = async (
  context: WriteContext,
  saved: SavedYouTubeVideo,
  fetched: YouTubeVideo
): Promise<boolean> => {
  const current = saved.thumbnail;

  if (current) {
    const { status } = toVideoFields(fetched, context.now);

    // Without an ETag, a new image cannot be told from the stored one.
    if (!REPLACEABLE_THUMBNAIL_STATUSES.has(status) || !current.etag) {
      return false;
    }
  }

  const thumbnail = await replaceThumbnail(context, {
    create: () =>
      createYouTubeThumbnail(context, fetched, current?.etag ?? null),
    fields: {},
    previousThumbnailId: saved.thumbnail_id,
    videoId: saved.id,
  });

  return thumbnail !== null;
};
