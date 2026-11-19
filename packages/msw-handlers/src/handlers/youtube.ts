import type { Tables } from "@shinju-date/database";
import { HttpResponse, http } from "msw";

import {
  ensureCollectionsSeeded,
  videos,
  youtubeChannels,
  youtubeVideos,
} from "../collections.js";
import {
  getYouTubeChannelIconUrl,
  getYouTubeUploadsPlaylistId,
  YOUTUBE_ICON_HOST,
} from "../youtube-urls.js";
import { createIconResponse } from "./icon.js";

/**
 * `snippet.thumbnails` of a channel, in the sizes the YouTube Data API
 * returns for channels.
 */
const createChannelThumbnails = (channelId: string) => ({
  default: {
    height: 88,
    url: getYouTubeChannelIconUrl(channelId, 88),
    width: 88,
  },
  high: {
    height: 800,
    url: getYouTubeChannelIconUrl(channelId, 800),
    width: 800,
  },
  medium: {
    height: 240,
    url: getYouTubeChannelIconUrl(channelId, 240),
    width: 240,
  },
});

/** A channel as returned by the YouTube Data API (`channels.list`). */
interface YouTubeChannel {
  contentDetails: { relatedPlaylists: { uploads: string } };
  id: string;
  kind: "youtube#channel";
  snippet: {
    customUrl?: string;
    thumbnails: ReturnType<typeof createChannelThumbnails>;
    title: string;
  };
}

const toYouTubeChannel = ({
  handle,
  id,
  title,
}: {
  handle: string | null;
  id: string;
  title: string;
}): YouTubeChannel => ({
  contentDetails: {
    relatedPlaylists: { uploads: getYouTubeUploadsPlaylistId(id) },
  },
  id,
  kind: "youtube#channel",
  snippet: {
    ...(handle ? { customUrl: handle } : {}),
    thumbnails: createChannelThumbnails(id),
    title,
  },
});

/** The format of the ID of a channel: `UC` and 22 characters. */
const CHANNEL_ID_PATTERN = /^UC[\w-]{22}$/u;

/**
 * The channels of the Supabase mock (`youtube_channels`), so that the apps
 * find the channels that they saved.
 */
const getSavedChannels = async (): Promise<Tables<"youtube_channels">[]> => {
  await ensureCollectionsSeeded();

  return youtubeChannels.findMany();
};

/**
 * Finds a channel by ID. A channel of the Supabase mock is answered as it is
 * saved, and any other ID in the format of a channel ID is answered with a
 * generated channel without videos, so that a new channel can be added in
 * the admin app.
 */
const findChannelById = async (id: string): Promise<YouTubeChannel | null> => {
  const savedChannels = await getSavedChannels();
  const channel = savedChannels.find(
    (candidate) => candidate.youtube_channel_id === id
  );

  if (channel) {
    return toYouTubeChannel({
      handle: channel.youtube_handle,
      id,
      title: channel.name ?? "",
    });
  }

  return CHANNEL_ID_PATTERN.test(id)
    ? toYouTubeChannel({ handle: null, id, title: `Channel ${id}` })
    : null;
};

/** A video of the Supabase mock on YouTube, with its video and its channel. */
interface MockYouTubeVideo {
  channel: Tables<"youtube_channels">;
  video: Tables<"videos">;
  youtubeVideo: Tables<"youtube_videos">;
}

/**
 * The videos of the Supabase mock on YouTube (`youtube_videos` with their
 * `videos` and `youtube_channels`), newest first like the uploads of a
 * channel. Deleted videos are left out, as they are no longer on YouTube.
 */
const getMockYouTubeVideos = async (): Promise<MockYouTubeVideo[]> => {
  const savedChannels = await getSavedChannels();
  const channelsById = new Map(
    savedChannels.map((channel) => [channel.id, channel])
  );
  const videosById = new Map(
    videos.findMany().map((video) => [video.id, video])
  );

  return youtubeVideos
    .findMany()
    .flatMap((youtubeVideo) => {
      const channel = channelsById.get(youtubeVideo.youtube_channel_id);
      const video = videosById.get(youtubeVideo.video_id);

      return channel && video && video.deleted_at === null
        ? [{ channel, video, youtubeVideo }]
        : [];
    })
    .toSorted((a, b) =>
      Temporal.Instant.compare(b.video.published_at, a.video.published_at)
    );
};

/** A timestamp as the YouTube Data API returns it, such as `2026-01-01T00:00:00Z`. */
const toYouTubeTimestamp = (instant: Temporal.Instant | string): string =>
  Temporal.Instant.from(instant).toString({ smallestUnit: "second" });

/**
 * `liveStreamingDetails` of a video, which follows its status like on
 * YouTube: an upcoming stream has only the scheduled start, a stream on air
 * has started, and a finished stream has ended after its duration. Videos
 * that are not streams have none.
 */
const toLiveStreamingDetails = ({
  duration,
  published_at,
  status,
}: Tables<"videos">) => {
  const start = toYouTubeTimestamp(published_at);

  switch (status) {
    case "UPCOMING": {
      return { scheduledStartTime: start };
    }
    case "LIVE": {
      return { actualStartTime: start, scheduledStartTime: start };
    }
    case "ENDED": {
      return {
        actualEndTime: toYouTubeTimestamp(
          Temporal.Instant.from(published_at).add({
            seconds: Temporal.Duration.from(duration).total("seconds"),
          })
        ),
        actualStartTime: start,
        scheduledStartTime: start,
      };
    }
    default: {
      // Videos that are not streams have no details
      return null;
    }
  }
};

/** A video as returned by the YouTube Data API (`videos.list`). */
const toYouTubeVideo = ({ channel, video, youtubeVideo }: MockYouTubeVideo) => {
  const id = youtubeVideo.youtube_video_id;
  const liveStreamingDetails = toLiveStreamingDetails(video);

  return {
    contentDetails: { duration: video.duration },
    id,
    kind: "youtube#video",
    ...(liveStreamingDetails ? { liveStreamingDetails } : {}),
    snippet: {
      channelId: channel.youtube_channel_id,
      channelTitle: channel.name ?? "",
      publishedAt: toYouTubeTimestamp(video.published_at),
      thumbnails: {
        high: {
          height: 360,
          url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          width: 480,
        },
        maxres: {
          height: 720,
          url: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
          width: 1280,
        },
      },
      title: video.title,
    },
  };
};

/** An item of the uploads of a channel (`playlistItems.list`). */
const toPlaylistItem = ({ video, youtubeVideo }: MockYouTubeVideo) => ({
  contentDetails: {
    videoId: youtubeVideo.youtube_video_id,
    videoPublishedAt: toYouTubeTimestamp(video.published_at),
  },
  id: `mock-playlist-item-${youtubeVideo.id}`,
  kind: "youtube#playlistItem",
});

/**
 * The values of a parameter that can be given several times or separated
 * with commas, such as `id`.
 */
const getListParameter = (url: URL, name: string): string[] =>
  url.searchParams
    .getAll(name)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

const normalizeHandle = (handle: string): string =>
  handle.startsWith("@") ? handle.slice(1).toLowerCase() : handle.toLowerCase();

const badRequest = (message: string): Response =>
  HttpResponse.json({ error: { code: 400, message } }, { status: 400 });

export const youtubeHandlers = [
  // YouTube Data API - channels.list, by `id` or by `forHandle` (or
  // `forUsername`)
  http.get("*/youtube/v3/channels", async ({ request }) => {
    const url = new URL(request.url);
    const ids = getListParameter(url, "id");
    const handle =
      url.searchParams.get("forHandle") ?? url.searchParams.get("forUsername");
    let items: YouTubeChannel[];

    if (ids.length > 0) {
      const channels = await Promise.all(ids.map(findChannelById));

      items = channels.filter((channel) => channel !== null);
    } else if (handle) {
      const handleKey = normalizeHandle(handle);

      const savedChannels = await getSavedChannels();

      items = savedChannels
        .filter(
          (channel) =>
            channel.youtube_handle !== null &&
            normalizeHandle(channel.youtube_handle) === handleKey
        )
        .map((channel) =>
          toYouTubeChannel({
            handle: channel.youtube_handle,
            id: channel.youtube_channel_id,
            title: channel.name ?? "",
          })
        );
    } else {
      return badRequest("Required parameter: id, forHandle, or forUsername");
    }

    return HttpResponse.json({
      items,
      kind: "youtube#channelListResponse",
      pageInfo: {
        resultsPerPage: items.length,
        totalResults: items.length,
      },
    });
  }),

  // YouTube Data API - playlistItems.list: the uploads of a channel, newest
  // first
  http.get("*/youtube/v3/playlistItems", async ({ request }) => {
    const url = new URL(request.url);
    const playlistId = url.searchParams.get("playlistId");

    if (!playlistId) {
      return badRequest("Required parameter: playlistId");
    }

    // oxlint-disable-next-line unicorn/prefer-number-coercion -- keeps the lenient parsing of the parameter (Number() would read "" as 0 and "10abc" as NaN)
    const maxResults = Number.parseInt(
      url.searchParams.get("maxResults") ?? "50",
      10
    );
    const pageToken = url.searchParams.get("pageToken");
    const mockVideos = await getMockYouTubeVideos();
    const items = mockVideos
      .filter(
        ({ channel }) =>
          getYouTubeUploadsPlaylistId(channel.youtube_channel_id) === playlistId
      )
      .map(toPlaylistItem);
    // oxlint-disable-next-line unicorn/prefer-number-coercion -- keeps the lenient parsing of the token (Number() would read "10abc" as NaN)
    const startIndex = pageToken ? Number.parseInt(pageToken, 10) : 0;
    const paginatedItems = items.slice(startIndex, startIndex + maxResults);
    const nextPageToken =
      startIndex + maxResults < items.length
        ? String(startIndex + maxResults)
        : undefined;

    return HttpResponse.json({
      items: paginatedItems,
      kind: "youtube#playlistItemListResponse",
      ...(nextPageToken ? { nextPageToken } : {}),
      pageInfo: {
        resultsPerPage: paginatedItems.length,
        totalResults: items.length,
      },
    });
  }),

  // YouTube Data API - videos.list. Videos that do not exist (or were
  // deleted) are left out, like on YouTube.
  http.get("*/youtube/v3/videos", async ({ request }) => {
    const ids = getListParameter(new URL(request.url), "id");

    if (ids.length === 0) {
      return badRequest("Required parameter: id");
    }

    const mockVideos = await getMockYouTubeVideos();
    const items = ids.flatMap((id) => {
      const mockVideo = mockVideos.find(
        ({ youtubeVideo }) => youtubeVideo.youtube_video_id === id
      );

      return mockVideo ? [toYouTubeVideo(mockVideo)] : [];
    });

    return HttpResponse.json({
      items,
      kind: "youtube#videoListResponse",
      pageInfo: {
        resultsPerPage: items.length,
        totalResults: items.length,
      },
    });
  }),

  // Mock thumbnail image downloads
  http.get("https://i.ytimg.com/vi/:videoId/:size", ({ params }) => {
    // Return a simple 1x1 pixel transparent PNG
    const transparentPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    return new HttpResponse(transparentPng, {
      headers: {
        "Content-Type": "image/png",
        ETag: `"${params["videoId"]}-${params["size"]}"`,
      },
    });
  }),

  // Mock channel icon downloads. Conditional requests get 304 like on
  // YouTube.
  http.get(`${YOUTUBE_ICON_HOST}/:icon`, ({ params, request }) =>
    createIconResponse(request, String(params["icon"]))
  ),
];
