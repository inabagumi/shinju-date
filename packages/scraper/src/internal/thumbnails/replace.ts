import type { TablesUpdate } from "@shinju-date/database";

import type { TypedSupabaseClient, WriteContext } from "../../types.js";
import { DatabaseError } from "../database-error.js";
import { updateVideo } from "../database/videos.js";
import { removeThumbnail } from "./thumbnail.js";
import type { Thumbnail } from "./thumbnail.js";

export interface ReplaceThumbnailOptions {
  /**
   * Stores the new thumbnail, or returns `null` when there is none to store.
   * Only called once, before the video is updated.
   */
  create: () => Promise<Thumbnail | null>;
  /** Other columns to update along with the thumbnail. */
  fields: Omit<TablesUpdate<"videos">, "thumbnail_id" | "updated_at">;
  /** The thumbnail the video uses now (`videos.thumbnail_id`), if any. */
  previousThumbnailId: string | null;
  videoId: string;
}

/**
 * Marks a thumbnail as unused from now on, so that the cleanup of unused
 * thumbnails keeps it for its grace period from then. `touch_thumbnail` only
 * runs the trigger of the table, which sets `updated_at` to the current time
 * of the database.
 */
const touchThumbnail = async (
  supabaseClient: TypedSupabaseClient,
  thumbnailId: string
): Promise<void> => {
  const { error } = await supabaseClient.rpc("touch_thumbnail", {
    p_thumbnail_id: thumbnailId,
  });

  if (error) {
    throw new DatabaseError("Failed to update a replaced thumbnail", error);
  }
};

/**
 * Points a video at a new thumbnail.
 *
 * The thumbnail the video used before is left in place: pages the public site
 * cached before the update still show its image, so it is only removed later
 * by `removeUnusedThumbnails`. Its `updated_at` is moved to the current time
 * of the database, from which that cleanup counts its grace period.
 *
 * When no new thumbnail is stored, only `fields` are updated (nothing is
 * written when they are empty) and the video keeps its thumbnail. The
 * triggers set `updated_at` of every updated row to the current time of the
 * database.
 *
 * @returns The new thumbnail, or `null` when none was stored.
 * @throws {Error} When the video (or the previous thumbnail) cannot be updated. The
 *   new thumbnail is removed then, and the video keeps its current one.
 */
export const replaceThumbnail = async (
  context: WriteContext,
  { create, fields, previousThumbnailId, videoId }: ReplaceThumbnailOptions
): Promise<Thumbnail | null> => {
  const { supabaseClient } = context;
  const thumbnail = await create();

  if (!thumbnail) {
    if (Object.keys(fields).length > 0) {
      await updateVideo(supabaseClient, videoId, fields);
    }

    return null;
  }

  try {
    // Before the video: should this fail, nothing has changed yet, and should
    // the video fail, the previous thumbnail is merely kept a little longer.
    if (previousThumbnailId && previousThumbnailId !== thumbnail.id) {
      await touchThumbnail(supabaseClient, previousThumbnailId);
    }

    await updateVideo(supabaseClient, videoId, {
      ...fields,
      thumbnail_id: thumbnail.id,
    });
  } catch (error) {
    await removeThumbnail(context, thumbnail);

    throw error;
  }

  return thumbnail;
};
