import { chunk } from "@shinju-date/helpers";
import { toDBString } from "@shinju-date/temporal-fns";

import type { TypedSupabaseClient } from "../../types.js";
import { IN_FILTER_CHUNK_SIZE } from "../constants.js";
import { DatabaseError, isForeignKeyViolation } from "../errors.js";
import { removeStoredImages } from "../images/index.js";
import { THUMBNAILS_BUCKET } from "./thumbnail.js";
import type { Thumbnail } from "./thumbnail.js";

/**
 * Thumbnails unused for less than this are left alone:
 *
 * - `createThumbnail` stores a thumbnail before its video points at it, so a
 *   fresh thumbnail may simply not be used yet.
 * - The public site caches video lists together with their thumbnail paths
 *   (`cacheLife('days')`, kept for up to a week), so a replaced thumbnail may
 *   still be shown by cached pages.
 *
 * `Temporal.Instant` cannot subtract days, hence the hours.
 */
export const UNUSED_THUMBNAIL_GRACE_PERIOD = Temporal.Duration.from({
  hours: 7 * 24,
});

/** At most this many thumbnails are deleted per run. */
export const UNUSED_THUMBNAIL_REMOVAL_LIMIT = 500;

export interface RemoveUnusedThumbnailsOptions {
  now: Temporal.Instant;
  /**
   * How long a thumbnail must have been unused, counted from its
   * `updated_at` (set when it is created and when a video stops using it).
   */
  olderThan: Temporal.Duration;
}

/**
 * Deletes the rows of `thumbnails`, then returns those that were deleted.
 *
 * The database refuses to delete a thumbnail a video uses. Should one of
 * `thumbnails` be used again by then, the rows are deleted one by one, so
 * that the others still go.
 *
 * @throws When the rows cannot be deleted for another reason.
 */
const deleteThumbnailRows = async (
  supabaseClient: TypedSupabaseClient,
  thumbnails: readonly Thumbnail[]
): Promise<Thumbnail[]> => {
  const { data, error } = await supabaseClient
    .from("thumbnails")
    .delete()
    .in(
      "id",
      thumbnails.map((thumbnail) => thumbnail.id)
    )
    .select("id");

  if (!error) {
    const deletedIds = new Set(data.map((row) => row.id));

    return thumbnails.filter((thumbnail) => deletedIds.has(thumbnail.id));
  }

  if (!isForeignKeyViolation(error)) {
    throw new DatabaseError("Failed to delete unused thumbnails", error);
  }

  const deleted: Thumbnail[] = [];

  for (const thumbnail of thumbnails) {
    const { data, error } = await supabaseClient
      .from("thumbnails")
      .delete()
      .eq("id", thumbnail.id)
      .select("id");

    if (error) {
      if (isForeignKeyViolation(error)) {
        continue;
      }

      throw new DatabaseError("Failed to delete an unused thumbnail", error);
    }

    if (data.length > 0) {
      deleted.push(thumbnail);
    }
  }

  return deleted;
};

/**
 * Deletes thumbnails that no video uses and that have not been used for
 * `olderThan`, e.g. those replaced by a newer thumbnail, or those whose video
 * could not be saved.
 *
 * Safe to run at any time: a thumbnail that becomes used again in the
 * meantime is refused by the database and kept. Rows are deleted before their
 * images, so a used thumbnail never loses its image. At most
 * {@link UNUSED_THUMBNAIL_REMOVAL_LIMIT} thumbnails, the oldest first, are
 * deleted per run; the next run picks up the rest.
 *
 * @returns The number of thumbnails deleted.
 * @throws When unused thumbnails cannot be listed or deleted. A failure to
 *   remove an image is ignored: without its row it is never served.
 */
export const removeUnusedThumbnails = async (
  supabaseClient: TypedSupabaseClient,
  { now, olderThan }: RemoveUnusedThumbnailsOptions
): Promise<number> => {
  const before = now.subtract(olderThan);
  const { data, error } = await supabaseClient
    .from("thumbnails")
    .select("id, path, videos(id)")
    // Filtering an embedded resource on null keeps the rows without one.
    .is("videos", null)
    .lt("updated_at", toDBString(before))
    .order("updated_at", { ascending: true })
    .limit(UNUSED_THUMBNAIL_REMOVAL_LIMIT);

  if (error) {
    throw new DatabaseError("Failed to list unused thumbnails", error);
  }

  let removedCount = 0;

  for (const thumbnails of chunk(
    data.map(({ id, path }): Thumbnail => ({ id, path })),
    IN_FILTER_CHUNK_SIZE
  )) {
    const deleted = await deleteThumbnailRows(supabaseClient, thumbnails);

    removedCount += deleted.length;

    if (deleted.length === 0) {
      continue;
    }

    try {
      await removeStoredImages(supabaseClient, {
        bucket: THUMBNAILS_BUCKET,
        paths: deleted.map((thumbnail) => thumbnail.path),
      });
    } catch {
      // Ignored on purpose, see above.
    }
  }

  return removedCount;
};
