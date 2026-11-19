import { isLiveTwitchVideoId } from "@shinju-date/constants";
import type { Tables } from "@shinju-date/database";
import { chunk } from "@shinju-date/helpers";
import type { QueryData } from "@supabase/supabase-js";

import { IN_FILTER_CHUNK_SIZE } from "../internal/constants.js";
import { DatabaseError } from "../internal/database-error.js";
import type { TypedSupabaseClient } from "../types.js";

/** Columns of the `videos` row of a saved Twitch video. */
const VIDEO_COLUMNS =
  "id, deleted_at, duration, published_at, status, thumbnail_id, title";

/** Columns of the `twitch_videos` row of a saved Twitch video. */
const TWITCH_VIDEO_COLUMNS = "id, stream_id, twitch_video_id, type";

/**
 * Selects a saved Twitch video from `videos`: its `videos` row plus its
 * `twitch_videos` row as `twitch_video`.
 */
export const SAVED_TWITCH_VIDEO_COLUMNS =
  `${VIDEO_COLUMNS}, twitch_video:twitch_videos!inner(${TWITCH_VIDEO_COLUMNS})` as const;

/**
 * {@link SAVED_TWITCH_VIDEO_COLUMNS} plus the broadcaster of the video, as
 * `twitch_video.twitch_user` (`null` when the account is gone).
 */
export const SAVED_LIVE_VIDEO_COLUMNS =
  `${VIDEO_COLUMNS}, twitch_video:twitch_videos!inner(${TWITCH_VIDEO_COLUMNS}, twitch_user:twitch_users(twitch_user_id))` as const;

const selectSavedTwitchVideos = (supabaseClient: TypedSupabaseClient) =>
  supabaseClient.from("videos").select(SAVED_TWITCH_VIDEO_COLUMNS);

/** A saved Twitch video: its `videos` row plus its `twitch_videos` row. */
export type SavedTwitchVideo = QueryData<
  ReturnType<typeof selectSavedTwitchVideos>
>[number];

/**
 * Whether the row still stands in for a broadcast whose archive is unknown,
 * i.e. its platform ID is the synthetic `live:{stream_id}`.
 */
export const isLivePlaceholder = (saved: SavedTwitchVideo): boolean =>
  isLiveTwitchVideoId(saved.twitch_video.twitch_video_id);

/**
 * Finds saved Twitch videos by platform video ID or by stream ID.
 *
 * Soft-deleted videos are included: their `twitch_videos` rows still occupy
 * the unique platform and stream IDs, so callers must know about them.
 */
export const findSavedTwitchVideos = async (
  supabaseClient: TypedSupabaseClient,
  column: "stream_id" | "twitch_video_id",
  values: readonly string[]
): Promise<SavedTwitchVideo[]> => {
  const savedVideos: SavedTwitchVideo[] = [];

  for (const ids of chunk([...new Set(values)], IN_FILTER_CHUNK_SIZE)) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- the chunks are sent one at a time to keep the load on the database small
    const { data, error } = await selectSavedTwitchVideos(supabaseClient).in(
      `twitch_video.${column}`,
      ids
    );

    if (error) {
      throw new DatabaseError("Failed to look up Twitch videos", error);
    }

    savedVideos.push(...data);
  }

  return savedVideos;
};

/**
 * Points a saved row at a (different) Helix video, e.g. when the archive of a
 * broadcast becomes known.
 */
export const updateTwitchVideo = async (
  supabaseClient: TypedSupabaseClient,
  twitchVideoRowId: string,
  values: Pick<Tables<"twitch_videos">, "type"> &
    Partial<Pick<Tables<"twitch_videos">, "stream_id" | "twitch_video_id">>
): Promise<void> => {
  const { error } = await supabaseClient
    .from("twitch_videos")
    .update(values)
    .eq("id", twitchVideoRowId);

  if (error) {
    throw new DatabaseError("Failed to update a Twitch video", error);
  }
};
