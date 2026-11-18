import type { QueryData } from "@supabase/supabase-js";

import type { TypedSupabaseClient } from "../types.js";

/**
 * Selects a saved YouTube video from `videos`: its `videos` row plus its
 * `youtube_videos` row as `youtube_video` and its thumbnail, if any, as
 * `thumbnail`.
 */
export const SAVED_YOUTUBE_VIDEO_COLUMNS =
  "id, duration, published_at, status, thumbnail_id, title, video_kind, thumbnail:thumbnails(id, path, etag), youtube_video:youtube_videos!inner(youtube_video_id)" as const;

function selectSavedYouTubeVideos(supabaseClient: TypedSupabaseClient) {
  return supabaseClient.from("videos").select(SAVED_YOUTUBE_VIDEO_COLUMNS);
}

/**
 * A saved YouTube video: its `videos` row plus its `youtube_videos` row and
 * its thumbnail.
 */
export type SavedYouTubeVideo = QueryData<
  ReturnType<typeof selectSavedYouTubeVideos>
>[number];
