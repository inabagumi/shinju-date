import { setTimeout as delay } from "node:timers/promises";

import type { ApiClient } from "@twurple/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RequestScheduler } from "./types.js";
import { getVideos, getVideosByUser, getVideosByUserPage } from "./videos.js";

type FakeHelixVideo = ReturnType<typeof helixVideo>;

const getVideosByIds = vi.fn<(ids: string[]) => Promise<FakeHelixVideo[]>>();
const helixGetVideosByUser =
  vi.fn<
    (
      ...args: Parameters<ApiClient["videos"]["getVideosByUser"]>
    ) => Promise<{ cursor?: string; data: FakeHelixVideo[] }>
  >();
const client = {
  videos: { getVideosByIds, getVideosByUser: helixGetVideosByUser },
} as unknown as ApiClient;

const notFound = (): Error =>
  Object.assign(new Error("Encountered HTTP status code 404"), {
    statusCode: 404,
  });

const helixVideo = (id: string) => ({
  creationDate: new Date("2024-01-01T00:00:00Z"),
  description: "",
  durationInSeconds: 3723,
  id,
  isPublic: true,
  language: "ja",
  publishDate: new Date("2024-01-01T00:00:00Z"),
  streamId: null,
  thumbnailUrl: "https://example.com/%{width}x%{height}.jpg",
  title: `Video ${id}`,
  type: "archive",
  url: `https://www.twitch.tv/videos/${id}`,
  userDisplayName: "Alice",
  userId: "user-1",
  userName: "alice",
  views: 1,
});

describe("Twitch videos API", () => {
  beforeEach(() => {
    getVideosByIds.mockReset();
    helixGetVideosByUser.mockReset();
  });

  describe(getVideos, () => {
    it("maps videos Helix returns", async () => {
      getVideosByIds.mockResolvedValue([helixVideo("1")]);

      const videos = await Array.fromAsync(getVideos({ client, ids: ["1"] }));

      expect(videos).toHaveLength(1);
      expect(videos[0]).toMatchObject({
        duration: "PT1H2M3S",
        id: "1",
        published_at: "2024-01-01T00:00:00Z",
        type: "archive",
      });
    });

    it("omits kinds of videos the database does not know", async () => {
      getVideosByIds.mockResolvedValue([
        helixVideo("1"),
        { ...helixVideo("2"), type: "unknown" },
      ]);

      const videos = await Array.fromAsync(
        getVideos({ client, ids: ["1", "2"] })
      );

      expect(videos.map((video) => video.id)).toStrictEqual(["1"]);
    });

    it("treats a 404 for a single video as not found", async () => {
      getVideosByIds.mockRejectedValue(notFound());

      await expect(
        Array.fromAsync(getVideos({ client, ids: ["gone"] }))
      ).resolves.toStrictEqual([]);
    });

    it("still returns existing videos when a batch answers 404", async () => {
      getVideosByIds.mockImplementation((ids: string[]) => {
        if (ids.includes("gone")) {
          return Promise.reject(notFound());
        }

        return Promise.resolve(ids.map(helixVideo));
      });

      const videos = await Array.fromAsync(
        getVideos({ client, ids: ["1", "2", "gone", "3", "4"] })
      );

      expect(videos.map((video) => video.id)).toStrictEqual([
        "1",
        "2",
        "3",
        "4",
      ]);
    });

    it("rethrows errors other than 404", async () => {
      getVideosByIds.mockRejectedValue(
        Object.assign(new Error("Encountered HTTP status code 500"), {
          statusCode: 500,
        })
      );

      await expect(
        Array.fromAsync(getVideos({ client, ids: ["1"] }))
      ).rejects.toThrow(/500/u);
    });

    it("requests the IDs in batches, one after another by default", async () => {
      getVideosByIds.mockImplementation((ids: string[]) =>
        Promise.resolve(ids.map(helixVideo))
      );
      const ids = Array.from({ length: 250 }, (_, i) => `${i}`);

      const videos = await Array.fromAsync(getVideos({ client, ids }));

      expect(videos.map((video) => video.id)).toStrictEqual(ids);
      expect(getVideosByIds.mock.calls).toStrictEqual([
        [ids.slice(0, 100)],
        [ids.slice(100, 200)],
        [ids.slice(200)],
      ]);
    });

    it("hands every request to the scheduler, including retries after a 404", async () => {
      let running = 0;
      let peak = 0;
      getVideosByIds.mockImplementation(async (ids: string[]) => {
        running += 1;
        peak = Math.max(peak, running);
        await delay(5);
        running -= 1;

        if (ids.includes("gone")) {
          throw notFound();
        }

        return ids.map(helixVideo);
      });
      const ids = [
        ...Array.from({ length: 199 }, (_, i) => `${i}`),
        "gone",
        "199",
      ];
      let scheduled = 0;
      const schedule: RequestScheduler = (request) => {
        scheduled += 1;

        return request();
      };

      const videos = await Array.fromAsync(
        getVideos({ client, ids, schedule })
      );

      expect(videos.map((video) => video.id)).toStrictEqual(
        ids.filter((id) => id !== "gone")
      );
      // The batches run at once; the one with `gone` is retried in halves.
      expect(peak).toBe(3);
      expect(scheduled).toBe(getVideosByIds.mock.calls.length);
    });
  });

  describe(getVideosByUserPage, () => {
    it("returns one page of a broadcaster with the cursor of the next", async () => {
      helixGetVideosByUser.mockResolvedValue({
        cursor: "next",
        data: [helixVideo("1"), helixVideo("2")],
      });

      const page = await getVideosByUserPage({
        after: "current",
        client,
        type: "all",
        userId: "user-1",
      });

      expect(helixGetVideosByUser).toHaveBeenCalledWith("user-1", {
        after: "current",
        limit: 100,
        type: "all",
      });
      expect(page.cursor).toBe("next");
      expect(page.videos.map((video) => video.id)).toStrictEqual(["1", "2"]);
    });

    it("ends the walk at an empty page even when Helix returns a cursor", async () => {
      helixGetVideosByUser.mockResolvedValue({ cursor: "stale", data: [] });

      await expect(
        getVideosByUserPage({ client, userId: "user-1" })
      ).resolves.toStrictEqual({
        cursor: null,
        videos: [],
      });
      expect(helixGetVideosByUser).toHaveBeenCalledWith("user-1", {
        limit: 100,
        type: "archive",
      });
    });
  });

  describe(getVideosByUser, () => {
    it("gets only the first page by default", async () => {
      helixGetVideosByUser.mockResolvedValue({
        cursor: "next",
        data: [helixVideo("1")],
      });

      const videos = await Array.fromAsync(
        getVideosByUser({ client, userId: "user-1" })
      );

      expect(videos.map((video) => video.id)).toStrictEqual(["1"]);
      expect(helixGetVideosByUser).toHaveBeenCalledExactlyOnceWith("user-1", {
        limit: 20,
        type: "archive",
      });
    });

    it("walks every page with `all`", async () => {
      helixGetVideosByUser
        .mockResolvedValueOnce({ cursor: "c1", data: [helixVideo("1")] })
        .mockResolvedValueOnce({ cursor: "c2", data: [helixVideo("2")] })
        .mockResolvedValueOnce({ cursor: "stale", data: [] });

      const videos = await Array.fromAsync(
        getVideosByUser({ all: true, client, type: "all", userId: "user-1" })
      );

      expect(videos.map((video) => video.id)).toStrictEqual(["1", "2"]);
      expect(helixGetVideosByUser.mock.calls).toStrictEqual([
        ["user-1", { limit: 100, type: "all" }],
        ["user-1", { after: "c1", limit: 100, type: "all" }],
        ["user-1", { after: "c2", limit: 100, type: "all" }],
      ]);
    });
  });
});
