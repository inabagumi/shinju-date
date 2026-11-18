import { createThumbnail } from "../internal/thumbnails/index.js";
import type { Thumbnail } from "../internal/thumbnails/index.js";
import type { WriteContext } from "../types.js";
import { getThumbnailSource } from "./video.js";

export interface CreateTwitchThumbnailOptions {
  /** Twitch thumbnail template URL (stream preview or VOD thumbnail). */
  thumbnailUrl: string;
  /** Platform video ID the image belongs to; used as the storage folder. */
  twitchVideoId: string;
}

/**
 * Stores a Twitch thumbnail, or returns `null` when Twitch has none yet or it
 * cannot be stored. A video without a thumbnail is still worth listing, so
 * failures are reported instead of thrown.
 */
export async function createTwitchThumbnail(
  { now, reportError, supabaseClient }: WriteContext,
  { thumbnailUrl, twitchVideoId }: CreateTwitchThumbnailOptions
): Promise<Thumbnail | null> {
  const source = getThumbnailSource(thumbnailUrl);

  if (!source) {
    return null;
  }

  try {
    return await createThumbnail({
      folder: twitchVideoId,
      now,
      source,
      supabaseClient,
    });
  } catch (error) {
    reportError(error, { twitchVideoId });

    return null;
  }
}
