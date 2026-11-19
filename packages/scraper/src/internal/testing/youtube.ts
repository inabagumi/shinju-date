import type { FilteredYouTubePlaylistItem } from "@shinju-date/youtube-api-client";

import type { SavedYouTubeVideo } from "../../youtube/saved-video.js";
import type { YouTubeChannel, YouTubeVideo } from "../../youtube/types.js";

/** Active talents with one YouTube channel each, as the crawls load them. */
export const YOUTUBE_TALENTS = [
  {
    id: "talent-1",
    youtube_channels: [{ id: "channel-row-1", youtube_channel_id: "UCaaa" }],
  },
  {
    id: "talent-2",
    youtube_channels: [{ id: "channel-row-2", youtube_channel_id: "UCbbb" }],
  },
];

/** Builds the channel `id` for tests, with `snippet` if given. */
export const createChannel = (
  id = "UCaaa",
  snippet?: YouTubeChannel["snippet"]
): YouTubeChannel => ({
  contentDetails: { relatedPlaylists: { uploads: `UU${id.slice(2)}` } },
  id,
  snippet: snippet === undefined ? { title: `Channel ${id}` } : snippet,
});

/** Builds an item of an uploads playlist for tests. */
export const createPlaylistItem = (
  videoId = "yt-1"
): FilteredYouTubePlaylistItem => ({ contentDetails: { videoId } });

/**
 * Builds a video resource for tests. Defaults to a regular upload whose title
 * and thumbnail are named after its ID.
 */
export const createVideo = (
  overrides: Partial<YouTubeVideo> = {}
): YouTubeVideo => {
  const id = overrides.id ?? "yt-1";

  return {
    contentDetails: { duration: "PT10M" },
    id,
    snippet: {
      publishedAt: "2024-05-01T10:00:00Z",
      thumbnails: {
        maxres: {
          height: 720,
          url: `https://i.ytimg.test/${id}.jpg`,
          width: 1280,
        },
      },
      title: `Video ${id}`,
    },
    ...overrides,
  };
};

/**
 * Builds a saved row of the YouTube video `youtubeVideoId`. Defaults to a
 * stream scheduled for 13:00 that matches `createVideo` with the
 * `liveStreamingDetails` of a scheduled stream. Its thumbnail follows
 * `thumbnail_id` and has no ETag, so it is never downloaded again.
 */
export const createSavedVideo = (
  youtubeVideoId = "yt-1",
  overrides: Partial<SavedYouTubeVideo> = {}
): SavedYouTubeVideo => {
  const thumbnailId =
    overrides.thumbnail_id === undefined
      ? `thumb-${youtubeVideoId}`
      : overrides.thumbnail_id;

  return {
    duration: "P0D",
    id: `video-${youtubeVideoId}`,
    published_at: "2024-05-01T13:00:00+00:00",
    status: "UPCOMING",
    thumbnail: thumbnailId
      ? { etag: null, id: thumbnailId, path: `${youtubeVideoId}/old.jpg` }
      : null,
    thumbnail_id: thumbnailId,
    title: `Video ${youtubeVideoId}`,
    video_kind: "standard",
    youtube_video: { youtube_video_id: youtubeVideoId },
    ...overrides,
  };
};
