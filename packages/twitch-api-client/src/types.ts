import type { Enums } from "@shinju-date/database";

/**
 * Runs one Helix request, e.g. once a slot of a queue that bounds the
 * requests in flight is free.
 */
export type RequestScheduler = <T>(request: () => Promise<T>) => Promise<T>;

/**
 * Kind of video to list with the Helix `Get Videos` API. `all` is a value of
 * the API, not of the database.
 */
export type TwitchVideoFilter = "archive" | "highlight" | "upload" | "all";

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  broadcaster_type: string;
  type: string;
  created_at: string;
}

export interface TwitchVideo {
  id: string;
  title: string;
  description: string;
  /** ISO 8601 duration (e.g. PT1H2M3S), ready for videos.duration */
  duration: string;
  language: string;
  published_at: string;
  created_at: string;
  thumbnail_url: string;
  /** The `twitch_video_type` enum of the database, except clips. */
  type: Exclude<Enums<"twitch_video_type">, "clip">;
  url: string;
  user_id: string;
  user_login: string;
  user_name: string;
  view_count: number;
  viewable: string;
  stream_id: string | null;
}

export interface TwitchVideoPage {
  /** Cursor of the next page, or `null` when this was the last one. */
  cursor: string | null;
  videos: TwitchVideo[];
}

export interface TwitchClip {
  id: string;
  title: string;
  url: string;
  embed_url: string;
  broadcaster_id: string;
  broadcaster_name: string;
  creator_id: string;
  creator_name: string;
  video_id: string;
  game_id: string;
  language: string;
  thumbnail_url: string;
  view_count: number;
  created_at: string;
  /** ISO 8601 duration (e.g. PT30S), ready for videos.duration */
  duration: string;
  vod_offset: number | null;
}

export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: "live";
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  /** Template URL with `{width}` / `{height}` placeholders */
  thumbnail_url: string;
  tags: string[];
  is_mature: boolean;
}
