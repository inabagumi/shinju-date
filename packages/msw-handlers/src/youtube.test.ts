import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  ensureCollectionsSeeded,
  profileImages,
  videos,
  youtubeChannels,
  youtubeVideos,
} from "./collections.js";
import { server } from "./server.js";

interface ChannelListResponse {
  items: {
    contentDetails: { relatedPlaylists: { uploads: string } };
    id: string;
    snippet: {
      customUrl?: string;
      thumbnails: Record<
        "default" | "high" | "medium",
        { height: number; url: string; width: number }
      >;
      title: string;
    };
  }[];
}

interface PlaylistItemListResponse {
  items: { contentDetails: { videoId: string } }[];
  nextPageToken?: string;
}

interface VideoListResponse {
  items: {
    contentDetails: { duration: string };
    id: string;
    liveStreamingDetails?: {
      actualEndTime?: string;
      actualStartTime?: string;
      scheduledStartTime?: string;
    };
    snippet: { channelId: string; publishedAt: string; title: string };
  }[];
}

const API_URL = "https://youtube.googleapis.com/youtube/v3";

async function get<Body>(path: string): Promise<Body> {
  const response = await fetch(`${API_URL}/${path}`);

  expect(response.status).toBe(200);

  return (await response.json()) as Body;
}

/** The YouTube channels of the Supabase mock. */
async function getSavedChannels() {
  await ensureCollectionsSeeded();

  return youtubeChannels.findMany();
}

/** The YouTube videos of the Supabase mock, with their videos. */
async function getSavedVideos() {
  await ensureCollectionsSeeded();

  const savedVideos = new Map(
    videos.findMany().map((video) => [video.id, video])
  );

  return youtubeVideos.findMany().flatMap((youtubeVideo) => {
    const video = savedVideos.get(youtubeVideo.video_id);

    return video ? [{ video, youtubeVideo }] : [];
  });
}

describe("YouTube Handlers", () => {
  beforeAll(() => {
    server.listen();
  });
  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe("channels.list", () => {
    it("returns the channels of the Supabase mock by ID", async () => {
      const channels = await getSavedChannels();
      const { items } = await get<ChannelListResponse>(
        `channels?id=${channels.map((channel) => channel.youtube_channel_id).join(",")}&part=contentDetails,id,snippet`
      );

      expect(items).toStrictEqual(
        channels.map((channel) =>
          expect.objectContaining({
            contentDetails: {
              relatedPlaylists: {
                uploads: `UU${channel.youtube_channel_id.slice(2)}`,
              },
            },
            id: channel.youtube_channel_id,
            snippet: expect.objectContaining({
              customUrl: channel.youtube_handle,
              title: channel.name,
            }),
          })
        )
      );
    });

    it("returns a channel of the Supabase mock by handle", async () => {
      const [channel] = await getSavedChannels();
      const { items } = await get<ChannelListResponse>(
        `channels?forHandle=${encodeURIComponent(channel?.youtube_handle ?? "")}&part=snippet`
      );

      expect(items.map((item) => item.id)).toStrictEqual([
        channel?.youtube_channel_id,
      ]);
    });

    it("generates a channel for any other channel ID", async () => {
      const id = "UCaaaaaaaaaaaaaaaaaaaaaa";
      const { items } = await get<ChannelListResponse>(
        `channels?id=${id}&part=snippet`
      );

      expect(items).toMatchObject([{ id }]);
    });

    it("finds no channel for a handle that is not saved", async () => {
      const { items } = await get<ChannelListResponse>(
        "channels?forHandle=@not-a-saved-handle&part=snippet"
      );

      expect(items).toStrictEqual([]);
    });

    it("returns the icons of each channel in square sizes", async () => {
      const [channel] = await getSavedChannels();
      const id = channel?.youtube_channel_id ?? "";
      const { items } = await get<ChannelListResponse>(
        `channels?id=${id}&part=snippet`
      );
      const thumbnails = items[0]?.snippet.thumbnails;

      expect(thumbnails?.default).toStrictEqual({
        height: 88,
        url: `https://yt3.ggpht.com/mock-${id}=s88-c-k-c0x00ffffff-no-rj`,
        width: 88,
      });
      expect(thumbnails?.medium).toMatchObject({ height: 240, width: 240 });
      expect(thumbnails?.high).toMatchObject({ height: 800, width: 800 });
    });

    it("returns the icons that the saved profile images were downloaded from", async () => {
      const channels = await getSavedChannels();

      for (const channel of channels) {
        const profileImage = profileImages
          .findMany()
          .find((image) => image.id === channel.profile_image_id);

        if (!profileImage) {
          continue;
        }

        const { items } = await get<ChannelListResponse>(
          `channels?id=${channel.youtube_channel_id}&part=snippet`
        );
        const response = await fetch(profileImage.source_url);

        expect(items[0]?.snippet.thumbnails.high.url).toBe(
          profileImage.source_url
        );
        expect(response.headers.get("ETag")).toBe(profileImage.etag);
      }
    });
  });

  describe("playlistItems.list", () => {
    it("lists the videos of a channel of the Supabase mock, newest first", async () => {
      const [channel] = await getSavedChannels();
      const expected = (await getSavedVideos())
        .filter(
          ({ youtubeVideo }) => youtubeVideo.youtube_channel_id === channel?.id
        )
        .sort((a, b) =>
          Temporal.Instant.compare(b.video.published_at, a.video.published_at)
        )
        .map(({ youtubeVideo }) => youtubeVideo.youtube_video_id);
      const playlistId = `UU${channel?.youtube_channel_id.slice(2)}`;
      const videoIds: string[] = [];
      let pageToken: string | undefined;

      do {
        const page: PlaylistItemListResponse = await get(
          `playlistItems?playlistId=${playlistId}&part=contentDetails&maxResults=10${pageToken ? `&pageToken=${pageToken}` : ""}`
        );

        videoIds.push(...page.items.map((item) => item.contentDetails.videoId));
        pageToken = page.nextPageToken;
      } while (pageToken);

      expect(expected.length).toBeGreaterThan(10);
      expect(videoIds).toStrictEqual(expected);
    });

    it("lists no videos of a generated channel", async () => {
      const { items } = await get<PlaylistItemListResponse>(
        "playlistItems?playlistId=UUaaaaaaaaaaaaaaaaaaaaaa&part=contentDetails"
      );

      expect(items).toStrictEqual([]);
    });
  });

  describe("videos.list", () => {
    it("returns the videos of the Supabase mock by ID", async () => {
      const savedVideos = (await getSavedVideos()).slice(0, 5);
      const { items } = await get<VideoListResponse>(
        `videos?id=${savedVideos.map(({ youtubeVideo }) => youtubeVideo.youtube_video_id).join(",")}&part=contentDetails,liveStreamingDetails,snippet`
      );

      expect(items).toStrictEqual(
        savedVideos.map(({ video, youtubeVideo }) =>
          expect.objectContaining({
            contentDetails: { duration: video.duration },
            id: youtubeVideo.youtube_video_id,
            snippet: expect.objectContaining({
              publishedAt: video.published_at,
              title: video.title,
            }),
          })
        )
      );
    });

    it.each([
      ["UPCOMING", ["scheduledStartTime"]],
      ["LIVE", ["actualStartTime", "scheduledStartTime"]],
      ["ENDED", ["actualEndTime", "actualStartTime", "scheduledStartTime"]],
    ] as const)(
      "returns the details of a stream that is %s",
      async (status, keys) => {
        const saved = (await getSavedVideos()).find(
          ({ video }) => video.status === status
        );
        const { items } = await get<VideoListResponse>(
          `videos?id=${saved?.youtubeVideo.youtube_video_id}&part=liveStreamingDetails`
        );
        const details = items[0]?.liveStreamingDetails;

        expect(Object.keys(details ?? {}).sort()).toStrictEqual(keys);
        expect(details?.scheduledStartTime).toBe(saved?.video.published_at);
      }
    );

    it("returns no details of a stream for a published video", async () => {
      const saved = (await getSavedVideos()).find(
        ({ video }) => video.status === "PUBLISHED"
      );
      const { items } = await get<VideoListResponse>(
        `videos?id=${saved?.youtubeVideo.youtube_video_id}&part=liveStreamingDetails`
      );

      expect(items).toHaveLength(1);
      expect(items[0]?.liveStreamingDetails).toBeUndefined();
    });

    it("leaves out the videos that do not exist", async () => {
      const { items } = await get<VideoListResponse>(
        "videos?id=missingVideo&part=snippet"
      );

      expect(items).toStrictEqual([]);
    });
  });

  describe("channel icons", () => {
    const iconUrl =
      "https://yt3.ggpht.com/mock-UCaaaaaaaaaaaaaaaaaaaaaa=s800-c-k-c0x00ffffff-no-rj";

    it("serves a PNG with an ETag", async () => {
      const response = await fetch(iconUrl);
      const body = new Uint8Array(await response.arrayBuffer());

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/png");
      expect(response.headers.get("ETag")).toBeTruthy();
      // PNG signature
      expect([...body.slice(0, 4)]).toStrictEqual([0x89, 0x50, 0x4e, 0x47]);
    });

    it("answers a matching conditional request with 304", async () => {
      const etag = (await fetch(iconUrl)).headers.get("ETag") ?? "";
      const response = await fetch(iconUrl, {
        headers: { "If-None-Match": etag },
      });

      expect(response.status).toBe(304);
    });
  });
});
