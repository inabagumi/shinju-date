import { toDBString } from "@shinju-date/temporal-fns";

import type { VideoFields, WriteContext } from "../../types.js";
import { insertVideo } from "../database/index.js";
import type { NewPlatformVideo, TalentAccount } from "../database/index.js";
import { removeThumbnail } from "../thumbnails/index.js";
import type { Thumbnail } from "../thumbnails/index.js";

/**
 * What differs between the platforms when a new video is saved: how it maps
 * to its `videos` row and its platform row, and how its thumbnail is stored.
 *
 * @typeParam TNew - A video to save, as the platform describes it.
 */
export interface NewVideoAdapter<TNew> {
  /**
   * Stores the thumbnail of the video.
   *
   * A video without a thumbnail is still worth listing, and a refresh fills
   * it in later, so a thumbnail that cannot be stored is reported instead of
   * thrown.
   *
   * @returns The stored thumbnail, or `null` when the platform has none yet
   *   or it cannot be stored.
   */
  createThumbnail(
    context: WriteContext,
    video: TNew
  ): Promise<Thumbnail | null>;
  /** The columns of the `videos` row kept in line with the platform. */
  toFields(video: TNew, now: Temporal.Instant): VideoFields;
  /** The platform row that identifies the video on its platform. */
  toPlatformVideo(video: TNew, account: TalentAccount): NewPlatformVideo;
}

/**
 * Inserts a new video of `account` with its platform row and its thumbnail.
 *
 * The thumbnail is stored first so the video is listed with it. When the
 * video is not inserted, because another run saved it first or the insert
 * failed, the thumbnail is removed again: nothing else would ever use it.
 *
 * @returns Whether the video was saved (`false` when another run saved it
 *   first).
 * @throws When the video cannot be inserted.
 */
export async function saveVideoWithThumbnail<TNew>(
  context: WriteContext,
  adapter: NewVideoAdapter<TNew>,
  video: TNew,
  account: TalentAccount
): Promise<boolean> {
  const { now, supabaseClient } = context;
  // Mapped before the thumbnail is stored, so a video that cannot be mapped
  // leaves nothing behind.
  const fields = adapter.toFields(video, now);
  const platformVideo = adapter.toPlatformVideo(video, account);
  const timestamp = toDBString(now);
  const thumbnail = await adapter.createThumbnail(context, video);
  let videoId: string | null;

  try {
    videoId = await insertVideo(
      supabaseClient,
      {
        ...fields,
        created_at: timestamp,
        platform: platformVideo.platform,
        talent_id: account.talentId,
        thumbnail_id: thumbnail?.id ?? null,
        updated_at: timestamp,
        visible: true,
      },
      platformVideo
    );
  } catch (error) {
    if (thumbnail) {
      await removeThumbnail(context, thumbnail);
    }

    throw error;
  }

  if (videoId) {
    return true;
  }

  if (thumbnail) {
    await removeThumbnail(context, thumbnail);
  }

  return false;
}
