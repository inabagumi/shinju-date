import type { youtube_v3 as youtube } from "@googleapis/youtube";
import { range } from "@shinju-date/helpers";
import { describe, expect, it, vi } from "vitest";

import {
  createChannel,
  createPlaylistItem,
  createVideo,
} from "../internal/testing/youtube.js";
import { YouTubeFetcher } from "./fetcher.js";

interface ListParams {
  id?: string[];
  maxResults?: number;
  part?: string[];
  playlistId?: string;
}

interface FakeYouTube {
  /** Channel ID → IDs in its uploads playlist, or an error to throw. */
  uploads?: Record<string, string[] | Error>;
  /** IDs YouTube knows about; other requested IDs are omitted. */
  channelIds?: string[];
  videoIds?: string[];
}

function createClient({
  channelIds = [],
  uploads = {},
  videoIds = [],
}: FakeYouTube) {
  const channelsList = vi.fn(async ({ id = [] }: ListParams) => ({
    data: {
      items: id
        .filter((value) => channelIds.includes(value))
        .map((value) => createChannel(value)),
    },
  }));

  const playlistItemsList = vi.fn(async ({ playlistId }: ListParams) => {
    const channelId = `UC${playlistId?.slice(2)}`;
    const result = uploads[channelId] ?? [];

    if (result instanceof Error) {
      throw result;
    }

    return {
      data: {
        items: result.map((videoId) => createPlaylistItem(videoId)),
      },
    };
  });

  const videosList = vi.fn(async ({ id = [], part = [] }: ListParams) => ({
    data: {
      items: id
        .filter((value) => videoIds.includes(value))
        .map((value) =>
          part.includes("snippet") ? createVideo({ id: value }) : { id: value }
        ),
    },
  }));

  const client = {
    channels: { list: channelsList },
    playlistItems: { list: playlistItemsList },
    videos: { list: videosList },
  } as unknown as youtube.Youtube;

  return { channelsList, client, playlistItemsList, videosList };
}

/**
 * A client whose `videos.list` takes a while, to see how many requests run at
 * once.
 */
function createSlowClient() {
  let running = 0;
  let peak = 0;
  const list = vi.fn(async () => {
    running++;
    peak = Math.max(peak, running);
    await new Promise((resolve) => setTimeout(resolve, 5));
    running--;

    return { data: { items: [] } };
  });

  return {
    client: { videos: { list } } as unknown as youtube.Youtube,
    list,
    peak: () => peak,
  };
}

function notFoundError(): Error {
  return Object.assign(new Error("The playlist cannot be found."), {
    status: 404,
  });
}

describe("YouTubeFetcher", () => {
  it("identifies its platform", () => {
    expect(new YouTubeFetcher().provider).toBe("youtube");
  });

  describe("getAccounts", () => {
    it("returns the channels YouTube knows about", async () => {
      const { client } = createClient({ channelIds: ["UCaaa", "UCbbb"] });
      const fetcher = new YouTubeFetcher({ client });

      const channels = await fetcher.getAccounts(["UCaaa", "UCbbb", "UCzzz"]);

      expect(channels.map((channel) => channel.id)).toEqual(["UCaaa", "UCbbb"]);
    });

    it("requests each ID once in batches of 50", async () => {
      const ids = range(120).map((i) => `UC${i}`);
      const { channelsList, client } = createClient({ channelIds: ids });
      const fetcher = new YouTubeFetcher({ client });

      const channels = await fetcher.getAccounts([...ids, ...ids]);

      expect(channels).toHaveLength(120);
      expect(channelsList).toHaveBeenCalledTimes(3);
    });

    it("does not call the API without IDs", async () => {
      const { channelsList, client } = createClient({});
      const fetcher = new YouTubeFetcher({ client });

      await expect(fetcher.getAccounts([])).resolves.toEqual([]);
      expect(channelsList).not.toHaveBeenCalled();
    });
  });

  describe("getRecentVideos", () => {
    it("lists the newest uploads of each channel", async () => {
      const { client, playlistItemsList } = createClient({
        channelIds: ["UCaaa", "UCbbb"],
        uploads: { UCaaa: ["a1", "a2"], UCbbb: ["b1"] },
      });
      const fetcher = new YouTubeFetcher({ client });

      const result = await fetcher.getRecentVideos(["UCaaa", "UCbbb"], {
        limit: 10,
      });

      expect(result).toEqual({
        failures: [],
        missingAccountIds: [],
        videos: [
          { channelId: "UCaaa", videoId: "a1" },
          { channelId: "UCaaa", videoId: "a2" },
          { channelId: "UCbbb", videoId: "b1" },
        ],
      });
      expect(playlistItemsList).toHaveBeenCalledWith(
        expect.objectContaining({ maxResults: 10, playlistId: "UUaaa" })
      );
    });

    it("reports channels YouTube does not return", async () => {
      const { client } = createClient({ channelIds: ["UCaaa"] });
      const fetcher = new YouTubeFetcher({ client });

      const result = await fetcher.getRecentVideos(["UCaaa", "UCgone"]);

      expect(result.missingAccountIds).toEqual(["UCgone"]);
    });

    it("keeps going when one channel fails", async () => {
      const error = new Error("quota exceeded");
      const { client } = createClient({
        channelIds: ["UCaaa", "UCbbb"],
        uploads: { UCaaa: error, UCbbb: ["b1"] },
      });
      const logger = {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      };
      const fetcher = new YouTubeFetcher({ client, logger });

      const result = await fetcher.getRecentVideos(["UCaaa", "UCbbb"]);

      expect(result.videos).toEqual([{ channelId: "UCbbb", videoId: "b1" }]);
      expect(result.failures).toEqual([{ accountId: "UCaaa", error }]);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it("treats a missing uploads playlist as a channel without uploads", async () => {
      const { client } = createClient({
        channelIds: ["UCaaa"],
        uploads: { UCaaa: notFoundError() },
      });
      const fetcher = new YouTubeFetcher({ client });

      const result = await fetcher.getRecentVideos(["UCaaa"]);

      expect(result.failures).toEqual([]);
      expect(result.videos).toEqual([]);
    });
  });

  describe("getVideos", () => {
    it("returns found videos and the IDs YouTube omitted", async () => {
      const { client } = createClient({ videoIds: ["v1", "v3"] });
      const fetcher = new YouTubeFetcher({ client });

      const result = await fetcher.getVideos(["v1", "v2", "v3"]);

      expect(result.videos.map((video) => video.id)).toEqual(["v1", "v3"]);
      expect(result.missingIds).toEqual(["v2"]);
    });

    it("reports every ID as missing when YouTube returns nothing", async () => {
      const { client } = createClient({});
      const fetcher = new YouTubeFetcher({ client });

      const result = await fetcher.getVideos(["v1", "v2"]);

      expect(result).toEqual({ missingIds: ["v1", "v2"], videos: [] });
    });

    it("batches large ID lists", async () => {
      const ids = range(120).map((i) => `v${i}`);
      const { client, videosList } = createClient({ videoIds: ids });
      const fetcher = new YouTubeFetcher({ client });

      const result = await fetcher.getVideos(ids);

      expect(result.videos).toHaveLength(120);
      expect(result.missingIds).toEqual([]);
      expect(videosList).toHaveBeenCalledTimes(3);
    });

    it("never runs more requests than the concurrency limit", async () => {
      const { client, list, peak } = createSlowClient();
      const fetcher = new YouTubeFetcher({ client, concurrency: 2 });

      await fetcher.getVideos(range(300).map((i) => `v${i}`));

      expect(list).toHaveBeenCalledTimes(6);
      expect(peak()).toBe(2);
    });

    it("rejects when a request fails", async () => {
      const client = {
        videos: { list: vi.fn().mockRejectedValue(new Error("boom")) },
      } as unknown as youtube.Youtube;
      const fetcher = new YouTubeFetcher({ client });

      await expect(fetcher.getVideos(["v1"])).rejects.toThrow("boom");
    });
  });

  describe("findMissingVideoIds", () => {
    it("returns the IDs that no longer exist", async () => {
      const { client, videosList } = createClient({ videoIds: ["v1", "v3"] });
      const fetcher = new YouTubeFetcher({ client });

      const missingIds = await fetcher.findMissingVideoIds(["v1", "v2", "v3"]);

      expect(missingIds).toEqual(["v2"]);
      expect(videosList).toHaveBeenCalledWith(
        expect.objectContaining({ part: ["id"] })
      );
    });

    it("batches large ID lists", async () => {
      const ids = range(75).map((i) => `v${i}`);
      const { client, videosList } = createClient({
        videoIds: ids.slice(0, 70),
      });
      const fetcher = new YouTubeFetcher({ client });

      const missingIds = await fetcher.findMissingVideoIds(ids);

      expect(missingIds).toEqual(ids.slice(70));
      expect(videosList).toHaveBeenCalledTimes(2);
    });

    it("never runs more requests than the concurrency limit", async () => {
      const { client, list, peak } = createSlowClient();
      const fetcher = new YouTubeFetcher({ client, concurrency: 2 });

      await fetcher.findMissingVideoIds(range(300).map((i) => `v${i}`));

      expect(list).toHaveBeenCalledTimes(6);
      expect(peak()).toBe(2);
    });
  });
});
