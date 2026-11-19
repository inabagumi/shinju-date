/**
 * The fixtures of the tests of the public site.
 *
 * - The rows of the tables (`createTalent`, `createVideo`, …), to put in the
 *   mock database with `seedSupabase()` (`test/supabase.ts`). The IDs are new
 *   UUIDs, so rows made by separate calls never collide
 * - What the fetchers return (`createVideoItem`, `createTalentDetail`, …), for
 *   the components that render it
 */

import type { Tables } from "@shinju-date/database";

import type { ScheduleVideo } from "@/lib/data/schedule";
import type { TalentDetail, TalentListItem } from "@/lib/data/talents";
import type { Video } from "@/lib/data/videos";

/** The time the rows are created and updated at, which no fetcher reads */
const CREATED_AT = "2026-01-01T00:00:00Z";

let sequence = 0;

/** A number that differs on every call, for the IDs of the platforms */
const nextSequence = (): number => {
  sequence += 1;

  return sequence;
};

export const createTalent = (
  overrides: Partial<Tables<"talents">> = {}
): Tables<"talents"> => ({
  created_at: CREATED_AT,
  deleted_at: null,
  id: crypto.randomUUID(),
  name: "朝霧ミオ",
  reading: null,
  status: "active",
  theme_color: null,
  updated_at: CREATED_AT,
  ...overrides,
});

/**
 * A video of a talent. The site shows only the videos with a YouTube or Twitch
 * video, so link it with `createYouTubeVideo` or `createTwitchVideo`.
 */
export const createVideo = (
  overrides: Partial<Tables<"videos">> & Pick<Tables<"videos">, "talent_id">
): Tables<"videos"> => ({
  created_at: CREATED_AT,
  deleted_at: null,
  deleted_reason: null,
  duration: "PT1H",
  id: crypto.randomUUID(),
  platform: "youtube",
  published_at: "2026-11-15T12:00:00Z",
  status: "ENDED",
  thumbnail_id: null,
  title: "歌枠",
  updated_at: CREATED_AT,
  video_kind: "standard",
  visible: true,
  ...overrides,
});

export const createThumbnail = (
  overrides: Partial<Tables<"thumbnails">> = {}
): Tables<"thumbnails"> => {
  const id = overrides.id ?? crypto.randomUUID();

  return {
    blur_data_url: "data:image/webp;base64,AAAA",
    created_at: CREATED_AT,
    deleted_at: null,
    etag: null,
    height: 720,
    id,
    path: `${id}.jpg`,
    updated_at: CREATED_AT,
    width: 1280,
    ...overrides,
  };
};

/** An icon of a YouTube channel or Twitch user */
export const createProfileImage = (
  overrides: Partial<Tables<"profile_images">> = {}
): Tables<"profile_images"> => {
  const id = overrides.id ?? crypto.randomUUID();

  return {
    blur_data_url: "data:image/webp;base64,AAAA",
    created_at: CREATED_AT,
    etag: null,
    height: 256,
    id,
    path: `youtube/${id}.webp`,
    source_url: `https://yt3.ggpht.com/${id}`,
    updated_at: CREATED_AT,
    width: 256,
    ...overrides,
  };
};

export const createYouTubeChannel = (
  overrides: Partial<Tables<"youtube_channels">> &
    Pick<Tables<"youtube_channels">, "talent_id">
): Tables<"youtube_channels"> => ({
  id: crypto.randomUUID(),
  name: null,
  profile_image_id: null,
  youtube_channel_id: `UC${String(nextSequence()).padStart(22, "0")}`,
  youtube_handle: null,
  ...overrides,
});

export const createTwitchUser = (
  overrides: Partial<Tables<"twitch_users">> &
    Pick<Tables<"twitch_users">, "talent_id">
): Tables<"twitch_users"> => ({
  id: crypto.randomUUID(),
  name: null,
  profile_image_id: null,
  twitch_login_name: null,
  twitch_user_id: String(100_000_000 + nextSequence()),
  ...overrides,
});

/** The YouTube video of a video, which links it to its channel */
export const createYouTubeVideo = (
  overrides: Partial<Tables<"youtube_videos">> &
    Pick<Tables<"youtube_videos">, "video_id" | "youtube_channel_id">
): Tables<"youtube_videos"> => ({
  id: crypto.randomUUID(),
  youtube_video_id: `YT${String(nextSequence()).padStart(9, "0")}`,
  ...overrides,
});

/** The Twitch video of a video, which links it to its user */
export const createTwitchVideo = (
  overrides: Partial<Tables<"twitch_videos">> &
    Pick<Tables<"twitch_videos">, "twitch_user_id" | "video_id">
): Tables<"twitch_videos"> => ({
  id: crypto.randomUUID(),
  stream_id: null,
  twitch_video_id: String(2_000_000_000 + nextSequence()),
  type: "archive",
  ...overrides,
});

/** A video and the YouTube video that links it to a channel */
export interface VideoOnYouTube {
  video: Tables<"videos">;
  youtubeVideo: Tables<"youtube_videos">;
}

/** A video of the talent of a YouTube channel, on the channel */
export const createVideoOnYouTube = (
  channel: Tables<"youtube_channels">,
  overrides: Partial<Tables<"videos">> = {},
  youtubeVideoOverrides: Partial<Tables<"youtube_videos">> = {}
): VideoOnYouTube => {
  const video = createVideo({
    platform: "youtube",
    talent_id: channel.talent_id,
    ...overrides,
  });

  return {
    video,
    youtubeVideo: createYouTubeVideo({
      video_id: video.id,
      youtube_channel_id: channel.id,
      ...youtubeVideoOverrides,
    }),
  };
};

/** A video and the Twitch video that links it to a user */
export interface VideoOnTwitch {
  twitchVideo: Tables<"twitch_videos">;
  video: Tables<"videos">;
}

/** A video of the talent of a Twitch user, by the user */
export const createVideoOnTwitch = (
  user: Tables<"twitch_users">,
  overrides: Partial<Tables<"videos">> = {},
  twitchVideoOverrides: Partial<Tables<"twitch_videos">> = {}
): VideoOnTwitch => {
  const video = createVideo({
    platform: "twitch",
    talent_id: user.talent_id,
    ...overrides,
  });

  return {
    twitchVideo: createTwitchVideo({
      twitch_user_id: user.id,
      video_id: video.id,
      ...twitchVideoOverrides,
    }),
    video,
  };
};

export const createAnnouncement = (
  overrides: Partial<Tables<"announcements">> = {}
): Tables<"announcements"> => ({
  created_at: CREATED_AT,
  enabled: true,
  end_at: "2026-11-20T00:00:00Z",
  id: crypto.randomUUID(),
  level: "info",
  message: "メンテナンスのお知らせ",
  start_at: "2026-11-10T00:00:00Z",
  updated_at: CREATED_AT,
  ...overrides,
});

/** A video of the video cards, on YouTube */
export const createVideoItem = (overrides: Partial<Video> = {}): Video => ({
  duration: "PT1H",
  id: "video-1",
  platform: "youtube",
  published_at: "2026-11-15T12:00:00Z",
  status: "ENDED",
  talent: { id: "talent-1", name: "朝霧ミオ" },
  thumbnail: null,
  title: "歌枠",
  twitch_video: null,
  video_kind: "standard",
  youtube_video: {
    youtube_channel: {
      name: null,
      profile_image: null,
      youtube_handle: null,
    },
    youtube_video_id: "YT_video1abc",
  },
  ...overrides,
});

/** A video of the schedule, on YouTube */
export const createScheduleVideoItem = (
  overrides: Partial<ScheduleVideo> = {}
): ScheduleVideo => {
  const { thumbnail: _, ...video } = createVideoItem();

  return {
    ...video,
    talent: { ...video.talent, theme_color: null },
    ...overrides,
  };
};

/** A talent of its page, without YouTube channels or Twitch users */
export const createTalentDetail = (
  overrides: Partial<TalentDetail> = {}
): TalentDetail => ({
  id: "00000000-0000-4000-8000-000000000001",
  name: "朝霧ミオ",
  theme_color: null,
  twitch_users: [],
  youtube_channels: [],
  ...overrides,
});

/** A talent of the list of talents, without YouTube channels or Twitch users */
export const createTalentListItem = (
  overrides: Partial<TalentListItem> = {}
): TalentListItem => ({
  id: "00000000-0000-4000-8000-000000000001",
  name: "朝霧ミオ",
  twitch_users: [],
  youtube_channels: [],
  ...overrides,
});
