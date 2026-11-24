import type {
  TwitchClip,
  TwitchStream,
  TwitchUser,
  TwitchVideo,
} from "@shinju-date/twitch-api-client";

import type { SavedTwitchVideo } from "../../twitch/saved-video.js";
import type { SavedLiveVideo } from "../../twitch/sync-live.js";
import type {
  SupabaseRequest,
  SupabaseResponder,
  SupabaseRoutes,
} from "./supabase.js";

/** An active talent with one Twitch account, as the crawls load it. */
export const TWITCH_TALENTS = [
  {
    id: "talent-1",
    twitch_users: [{ id: "user-row-1", twitch_user_id: "twitch-user-1" }],
  },
];

/** Builds the Helix user `id` (Alice by default) for tests. */
export const createUser = (
  id = "twitch-user-1",
  overrides: Partial<Omit<TwitchUser, "id">> = {}
): TwitchUser => ({
  broadcaster_type: "",
  created_at: "2020-01-01T00:00:00Z",
  description: "",
  display_name: "Alice",
  id,
  login: "alice",
  offline_image_url: "",
  profile_image_url: "",
  type: "",
  ...overrides,
});

/** Builds a Helix stream with sensible defaults for tests. */
export const createStream = (
  overrides: Partial<TwitchStream> = {}
): TwitchStream => ({
  game_id: "1",
  game_name: "Game",
  id: "stream-1",
  is_mature: false,
  language: "ja",
  started_at: "2024-05-01T09:00:00Z",
  tags: [],
  thumbnail_url: "https://cdn.test/live-{width}x{height}.jpg",
  title: "Live now",
  type: "live",
  user_id: "twitch-user-1",
  user_login: "alice",
  user_name: "Alice",
  viewer_count: 10,
  ...overrides,
});

/** Builds a Helix video (an archive by default) for tests. */
export const createVideo = (
  overrides: Partial<TwitchVideo> = {}
): TwitchVideo => ({
  created_at: "2024-05-01T09:00:00Z",
  description: "",
  duration: "PT2H",
  id: "vod-1",
  language: "ja",
  published_at: "2024-05-01T09:00:00Z",
  stream_id: "stream-1",
  thumbnail_url: "https://cdn.test/vod-%{width}x%{height}.jpg",
  title: "Archive",
  type: "archive",
  url: "https://www.twitch.tv/videos/vod-1",
  user_id: "twitch-user-1",
  user_login: "alice",
  user_name: "Alice",
  view_count: 1,
  viewable: "public",
  ...overrides,
});

/** Builds a Helix clip for tests. */
export const createClip = (
  overrides: Partial<TwitchClip> = {}
): TwitchClip => ({
  broadcaster_id: "twitch-user-1",
  broadcaster_name: "Alice",
  created_at: "2024-05-01T09:00:00Z",
  creator_id: "twitch-user-2",
  creator_name: "Bob",
  duration: "PT30S",
  embed_url: "",
  game_id: "1",
  id: "clip-1",
  language: "ja",
  thumbnail_url: "https://cdn.test/clip.jpg",
  title: "Clip",
  url: "https://clips.twitch.tv/clip-1",
  video_id: "vod-1",
  view_count: 1,
  vod_offset: 0,
  ...overrides,
});

interface SavedVideoOverrides extends Partial<
  Omit<SavedTwitchVideo, "twitch_video">
> {
  twitch_video?: Partial<SavedTwitchVideo["twitch_video"]>;
}

/**
 * Builds a saved row. Defaults to the placeholder of a broadcast that is on
 * air: LIVE, no archive known yet.
 */
export const createSavedVideo = ({
  twitch_video: twitchVideo,
  ...overrides
}: SavedVideoOverrides = {}): SavedTwitchVideo => ({
  deleted_at: null,
  duration: "P0D",
  id: "video-1",
  published_at: "2024-05-01T09:00:00+00:00",
  status: "LIVE",
  thumbnail_id: "thumb-live",
  title: "Live now",
  video_kind: "stream",
  ...overrides,
  twitch_video: {
    id: "twitch-row-1",
    stream_id: "stream-1",
    twitch_video_id: "live:stream-1",
    type: null,
    ...twitchVideo,
  },
});

/** Builds a saved archive that matches `createVideo()` exactly. */
export const createSavedArchive = ({
  twitch_video: twitchVideo,
  ...overrides
}: SavedVideoOverrides = {}): SavedTwitchVideo =>
  createSavedVideo({
    duration: "PT2H",
    status: "ENDED",
    thumbnail_id: "thumb-1",
    title: "Archive",
    ...overrides,
    twitch_video: {
      twitch_video_id: "vod-1",
      type: "archive",
      ...twitchVideo,
    },
  });

/**
 * Builds a saved row shown as LIVE, with the Twitch user it belongs to
 * (`null` when the account is gone).
 */
export const createSavedLiveVideo = (
  overrides: SavedVideoOverrides = {},
  twitchUserId: string | null = "twitch-user-1"
): SavedLiveVideo => ({ ...createSavedVideo(overrides), twitchUserId });

/** The column a lookup of saved rows filters on, if the request is one. */
const getLookupColumn = (
  query: Record<string, string>
): "stream_id" | "twitch_video_id" | undefined => {
  if (query["twitch_video.stream_id"]) {
    return "stream_id";
  }

  if (query["twitch_video.twitch_video_id"]) {
    return "twitch_video_id";
  }

  return undefined;
};

/**
 * Whether a `GET videos` request looks up saved rows by stream ID or Twitch
 * video ID, as {@link findSavedVideos} answers it.
 */
export const isSavedVideoLookup = ({ query }: SupabaseRequest): boolean =>
  getLookupColumn(query) !== undefined;

/**
 * Answers the lookup of saved rows by stream ID or Twitch video ID
 * (`GET videos`) with the matching ones among `savedVideos`.
 */
export const findSavedVideos =
  (savedVideos: readonly SavedTwitchVideo[]): SupabaseResponder =>
  ({ query }) => {
    const column = getLookupColumn(query) ?? "twitch_video_id";
    const ids = (query[`twitch_video.${column}`] ?? "").slice(4, -1).split(",");

    return savedVideos.filter((saved) =>
      ids.includes(String(saved.twitch_video[column]))
    );
  };

/**
 * Routes of a database in which the active talent of `TWITCH_TALENTS`
 * has `savedLiveVideos` shown as LIVE.
 */
export const liveVideoRoutes = (
  savedLiveVideos: readonly SavedLiveVideo[] = []
): SupabaseRoutes => {
  const lookUp = findSavedVideos(savedLiveVideos);

  return {
    "GET talents": TWITCH_TALENTS,
    "GET videos": (request) =>
      isSavedVideoLookup(request)
        ? lookUp(request)
        : savedLiveVideos.map(({ twitch_video, twitchUserId, ...video }) => ({
            ...video,
            twitch_video: {
              ...twitch_video,
              twitch_user: twitchUserId
                ? { twitch_user_id: twitchUserId }
                : null,
            },
          })),
  };
};
