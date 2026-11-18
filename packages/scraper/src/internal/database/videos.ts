import type { TablesInsert, TablesUpdate } from "@shinju-date/database";
import { chunk } from "@shinju-date/helpers";
import { toDBString } from "@shinju-date/temporal-fns";

import type { TypedSupabaseClient } from "../../types.js";
import { IN_FILTER_CHUNK_SIZE, SOFT_DELETE_CHUNK_SIZE } from "../constants.js";
import { DatabaseError } from "../database-error.js";

export type NewVideo = Omit<TablesInsert<"videos">, "id">;

/** The platform-specific row that identifies a video on its source platform. */
export type NewPlatformVideo =
  | {
      platform: "youtube";
      values: Omit<TablesInsert<"youtube_videos">, "id" | "video_id">;
    }
  | {
      platform: "twitch";
      values: Omit<TablesInsert<"twitch_videos">, "id" | "video_id">;
    };

/**
 * Inserts a video together with its platform row (`insert_video`, which
 * inserts both in one transaction, so a video is never left without its
 * platform row).
 *
 * @returns The new video ID, or `null` when the platform video already exists
 *   (another run saved it first). Nothing is inserted then.
 */
export const insertVideo = async (
  supabaseClient: TypedSupabaseClient,
  video: NewVideo,
  platformVideo: NewPlatformVideo
): Promise<string | null> => {
  const { data, error } = await supabaseClient.rpc("insert_video", {
    p_platform: platformVideo.platform,
    p_platform_video: platformVideo.values,
    p_video: video,
  });

  if (error) {
    throw new DatabaseError(
      `Failed to insert a ${platformVideo.platform} video`,
      error
    );
  }

  // The generated types do not tell that the function returns `NULL` when
  // the platform video already exists.
  return data as string | null;
};

/**
 * Updates the given columns of one video.
 *
 * `updated_at` is not one of them: the `on_videos_update` trigger sets it to
 * the current time of the database on every update.
 */
export const updateVideo = async (
  supabaseClient: TypedSupabaseClient,
  videoId: string,
  values: Omit<TablesUpdate<"videos">, "updated_at">
): Promise<void> => {
  const { error } = await supabaseClient
    .from("videos")
    .update(values)
    .eq("id", videoId);

  if (error) {
    throw new DatabaseError("Failed to update a video", error);
  }
};

export interface SoftDeleteVideosOptions {
  now: Temporal.Instant;
  videoIds: readonly string[];
}

/**
 * Soft-deletes videos that are no longer available on their source platform,
 * with their thumbnails (`soft_delete_videos`, which updates both in one
 * transaction).
 *
 * Rows that were deleted in the meantime are left alone so their
 * `deleted_reason` (e.g. `withdrawn`) is never overwritten.
 *
 * @returns The number of videos that were deleted by this call.
 */
export const softDeleteUnavailableVideos = async (
  supabaseClient: TypedSupabaseClient,
  { now, videoIds }: SoftDeleteVideosOptions
): Promise<number> => {
  const deletedAt = toDBString(now);
  let deletedCount = 0;

  for (const ids of chunk(videoIds, SOFT_DELETE_CHUNK_SIZE)) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- the chunks are sent one at a time to keep the load on the database small
    const { data, error } = await supabaseClient.rpc("soft_delete_videos", {
      p_deleted_at: deletedAt,
      p_reason: "unavailable",
      p_video_ids: ids,
    });

    if (error) {
      throw new DatabaseError("Failed to soft-delete videos", error);
    }

    deletedCount += data.length;
  }

  return deletedCount;
};

/**
 * Returns which of the given YouTube video IDs are already saved, including
 * soft-deleted videos.
 */
export const findSavedYouTubeVideoIds = async (
  supabaseClient: TypedSupabaseClient,
  youtubeVideoIds: readonly string[]
): Promise<Set<string>> => {
  const savedIds = new Set<string>();

  for (const ids of chunk(youtubeVideoIds, IN_FILTER_CHUNK_SIZE)) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- the chunks are sent one at a time to keep the load on the database small
    const { data, error } = await supabaseClient
      .from("youtube_videos")
      .select("youtube_video_id")
      .in("youtube_video_id", ids);

    if (error) {
      throw new DatabaseError("Failed to look up YouTube videos", error);
    }

    for (const row of data) {
      savedIds.add(row.youtube_video_id);
    }
  }

  return savedIds;
};
