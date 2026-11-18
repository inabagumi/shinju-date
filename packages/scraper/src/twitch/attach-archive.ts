import { replaceThumbnail } from "../internal/thumbnails/index.js";
import type { WriteContext } from "../types.js";
import { isLivePlaceholder, updateTwitchVideo } from "./saved-video.js";
import type { SavedTwitchVideo } from "./saved-video.js";
import { createTwitchThumbnail } from "./thumbnail.js";
import type { TwitchVideo } from "./types.js";
import { toVideoFields } from "./video.js";

export interface AttachArchiveOptions {
  /**
   * Whether the stream of the broadcast is still on air. The row is only
   * linked to its archive then, and keeps describing the stream until the
   * live sync ends it.
   */
  stillLive: boolean;
}

/**
 * Attaches the archive of a broadcast to the row that stands in for it: links
 * the row to the archive and, once the stream is offline, gives the row the
 * archive's thumbnail and details.
 *
 * @returns Whether the row took over the archive's details.
 */
export const attachArchive = async (
  context: WriteContext,
  saved: SavedTwitchVideo,
  archive: TwitchVideo,
  { stillLive }: AttachArchiveOptions
): Promise<boolean> => {
  // Link first: should a later step fail, the row keeps its status and a
  // later run finishes the job, instead of leaving an ended row without its
  // archive.
  if (isLivePlaceholder(saved)) {
    await updateTwitchVideo(context.supabaseClient, saved.twitch_video.id, {
      twitch_video_id: archive.id,
      type: archive.type,
    });
  }

  if (stillLive) {
    return false;
  }

  // The preview of the stream gives way to the thumbnail of the archive. The
  // preview is left for the cleanup of unused thumbnails, since cached pages
  // may still show it.
  await replaceThumbnail(context, {
    create: () =>
      createTwitchThumbnail(context, {
        thumbnailUrl: archive.thumbnail_url,
        twitchVideoId: archive.id,
      }),
    fields: toVideoFields(archive),
    previousThumbnailId: saved.thumbnail_id,
    videoId: saved.id,
  });

  return true;
};
