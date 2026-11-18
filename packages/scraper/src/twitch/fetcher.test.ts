import type {
  TwitchClip,
  TwitchStream,
  TwitchUser,
  TwitchVideo,
} from "@shinju-date/twitch-api-client";
import { describe, expect, it, vi } from "vitest";

import {
  createClip,
  createStream,
  createUser,
  createVideo,
} from "../internal/testing/twitch.js";
import { TwitchFetcher } from "./fetcher.js";
import type { TwitchApi } from "./types.js";

function createClient(overrides: Partial<TwitchApi> = {}): TwitchApi {
  return {
    getClips: vi.fn(() => fromArray<TwitchClip>([])),
    getStreamsByUserIds: vi.fn(() => fromArray<TwitchStream>([])),
    getUsers: vi.fn(() => fromArray<TwitchUser>([])),
    getVideos: vi.fn(() => fromArray<TwitchVideo>([])),
    getVideosByUser: vi.fn(() => fromArray<TwitchVideo>([])),
    getVideosByUserPage: vi.fn(async () => ({ cursor: null, videos: [] })),
    ...overrides,
  };
}

async function* fromArray<T>(items: T[]): AsyncGenerator<T, void, undefined> {
  for (const item of items) {
    yield item;
  }
}

describe("TwitchFetcher", () => {
  it("identifies its platform", () => {
    expect(new TwitchFetcher({ client: createClient() }).provider).toBe(
      "twitch"
    );
  });

  describe("getAccounts", () => {
    it("returns the users Helix knows about", async () => {
      const getUsers = vi.fn(({ ids }: { ids: string[] }) =>
        fromArray(ids.filter((id) => id !== "gone").map((id) => createUser(id)))
      );
      const fetcher = new TwitchFetcher({ client: createClient({ getUsers }) });

      const users = await fetcher.getAccounts(["1", "gone", "2"]);

      expect(users.map((value) => value.id)).toEqual(["1", "2"]);
    });

    it("passes each ID once and leaves batching to the client", async () => {
      const ids = Array.from({ length: 150 }, (_, i) => `${i}`);
      const getUsers = vi.fn(({ ids }: { ids: string[] }) =>
        fromArray(ids.map((id) => createUser(id)))
      );
      const fetcher = new TwitchFetcher({ client: createClient({ getUsers }) });

      const users = await fetcher.getAccounts([...ids, ...ids]);

      expect(users).toHaveLength(150);
      expect(getUsers).toHaveBeenCalledExactlyOnceWith({
        ids,
        schedule: expect.any(Function),
      });
    });

    it("does not call Helix without IDs", async () => {
      const client = createClient();
      const fetcher = new TwitchFetcher({ client });

      await expect(fetcher.getAccounts([])).resolves.toEqual([]);
      expect(client.getUsers).not.toHaveBeenCalled();
    });
  });

  describe("getLiveStreams", () => {
    it("returns the streams that are live", async () => {
      const getStreamsByUserIds = vi.fn(() =>
        fromArray([createStream({ id: "s1" })])
      );
      const fetcher = new TwitchFetcher({
        client: createClient({ getStreamsByUserIds }),
      });

      const streams = await fetcher.getLiveStreams(["user-1", "user-2"]);

      expect(streams.map((value) => value.id)).toEqual(["s1"]);
      expect(getStreamsByUserIds).toHaveBeenCalledWith({
        schedule: expect.any(Function),
        userIds: ["user-1", "user-2"],
      });
    });
  });

  describe("getRecentVideos", () => {
    it("lists archives of every broadcaster by default", async () => {
      const getVideosByUser = vi.fn(({ userId }: { userId: string }) =>
        fromArray([createVideo({ id: `${userId}-v1`, user_id: userId })])
      );
      const fetcher = new TwitchFetcher({
        client: createClient({ getVideosByUser }),
      });

      const result = await fetcher.getRecentVideos(["user-1", "user-2"]);

      expect(result.failures).toEqual([]);
      expect(result.videos.map((value) => value.id)).toEqual([
        "user-1-v1",
        "user-2-v1",
      ]);
      expect(getVideosByUser).toHaveBeenCalledWith({
        limit: 20,
        type: "archive",
        userId: "user-1",
      });
    });

    it("passes the requested type and limit", async () => {
      const getVideosByUser = vi.fn(() => fromArray<TwitchVideo>([]));
      const fetcher = new TwitchFetcher({
        client: createClient({ getVideosByUser }),
      });

      await fetcher.getRecentVideos(["user-1"], { limit: 5, type: "upload" });

      expect(getVideosByUser).toHaveBeenCalledWith({
        limit: 5,
        type: "upload",
        userId: "user-1",
      });
    });

    it("keeps going when one broadcaster fails", async () => {
      const error = new Error("helix unavailable");
      const getVideosByUser = vi.fn(({ userId }: { userId: string }) => {
        if (userId === "user-1") {
          throw error;
        }

        return fromArray([createVideo({ id: "v2", user_id: userId })]);
      });
      const logger = {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      };
      const fetcher = new TwitchFetcher({
        client: createClient({ getVideosByUser }),
        logger,
      });

      const result = await fetcher.getRecentVideos(["user-1", "user-2"]);

      expect(result.videos.map((value) => value.id)).toEqual(["v2"]);
      expect(result.failures).toEqual([{ accountId: "user-1", error }]);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it("never runs more requests than the concurrency limit", async () => {
      let running = 0;
      let peak = 0;
      const getVideosByUser = vi.fn(async function* () {
        running++;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running--;
        yield* [] as TwitchVideo[];
      });
      const fetcher = new TwitchFetcher({
        client: createClient({ getVideosByUser }),
        concurrency: 2,
      });

      await fetcher.getRecentVideos(["1", "2", "3", "4", "5", "6"]);

      expect(peak).toBe(2);
    });
  });

  describe("getVideos", () => {
    it("returns found videos and the IDs Helix omitted", async () => {
      const getVideos = vi.fn(({ ids }: { ids: string[] }) =>
        fromArray(
          ids.filter((id) => id !== "gone").map((id) => createVideo({ id }))
        )
      );
      const fetcher = new TwitchFetcher({
        client: createClient({ getVideos }),
      });

      const result = await fetcher.getVideos(["v1", "gone", "v2"]);

      expect(result.videos.map((value) => value.id)).toEqual(["v1", "v2"]);
      expect(result.missingIds).toEqual(["gone"]);
    });

    it("makes each request within the concurrency limit", async () => {
      let running = 0;
      let peak = 0;
      // Like the Helix client: every batch at once, each through `schedule`.
      const getVideos = vi.fn(async function* ({
        ids,
        schedule = (request) => request(),
      }: Parameters<TwitchApi["getVideos"]>[0]) {
        const batches = await Promise.all(
          ids.map((id) =>
            schedule(async () => {
              running++;
              peak = Math.max(peak, running);
              await new Promise((resolve) => setTimeout(resolve, 5));
              running--;

              return createVideo({ id });
            })
          )
        );

        yield* batches;
      });
      const fetcher = new TwitchFetcher({
        client: createClient({ getVideos }),
        concurrency: 2,
      });

      const result = await fetcher.getVideos(["1", "2", "3", "4", "5"]);

      expect(result.videos).toHaveLength(5);
      expect(peak).toBe(2);
    });

    it("rejects when a request fails", async () => {
      const getVideos = vi.fn(() => {
        throw new Error("boom");
      });
      const fetcher = new TwitchFetcher({
        client: createClient({ getVideos }),
      });

      await expect(fetcher.getVideos(["v1"])).rejects.toThrow("boom");
    });
  });

  describe("getClips", () => {
    it("returns found clips and the IDs Helix omitted", async () => {
      const getClips = vi.fn(({ ids }: { ids: string[] }) =>
        fromArray(
          ids.filter((id) => id !== "gone").map((id) => createClip({ id }))
        )
      );
      const fetcher = new TwitchFetcher({ client: createClient({ getClips }) });

      const result = await fetcher.getClips(["c1", "gone"]);

      expect(result.clips.map((value) => value.id)).toEqual(["c1"]);
      expect(result.missingIds).toEqual(["gone"]);
    });
  });
});
