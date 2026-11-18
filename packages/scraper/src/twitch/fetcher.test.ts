import type {
  TwitchClip,
  TwitchStream,
  TwitchUser,
  TwitchVideo,
} from "@shinju-date/twitch-api-client";
import { describe, expect, it, vi } from "vitest";

import type { Logger } from "../internal/logger.js";
import {
  createClip,
  createStream,
  createUser,
  createVideo,
} from "../internal/testing/twitch.js";
import { TwitchFetcher } from "./fetcher.js";
import type { TwitchApi } from "./types.js";

const createClient = (overrides: Partial<TwitchApi> = {}): TwitchApi => ({
  getClips: vi.fn<TwitchApi["getClips"]>(() => fromArray<TwitchClip>([])),
  getStreamsByUserIds: vi.fn<TwitchApi["getStreamsByUserIds"]>(() =>
    fromArray<TwitchStream>([])
  ),
  getUsers: vi.fn<TwitchApi["getUsers"]>(() => fromArray<TwitchUser>([])),
  getVideos: vi.fn<TwitchApi["getVideos"]>(() => fromArray<TwitchVideo>([])),
  getVideosByUser: vi.fn<TwitchApi["getVideosByUser"]>(() =>
    fromArray<TwitchVideo>([])
  ),
  getVideosByUserPage: vi.fn<TwitchApi["getVideosByUserPage"]>(async () => ({
    cursor: null,
    videos: [],
  })),
  ...overrides,
});

const fromArray = async function* fromArray<T>(
  items: T[]
): AsyncGenerator<T, void, undefined> {
  for (const item of items) {
    yield item;
  }
};

describe(TwitchFetcher, () => {
  it("identifies its platform", () => {
    expect(new TwitchFetcher({ client: createClient() }).provider).toBe(
      "twitch"
    );
  });

  describe("getAccounts", () => {
    it("returns the users Helix knows about", async () => {
      const getUsers = vi.fn<TwitchApi["getUsers"]>(
        ({ ids }: { ids: string[] }) =>
          fromArray(
            ids.filter((id) => id !== "gone").map((id) => createUser(id))
          )
      );
      const fetcher = new TwitchFetcher({ client: createClient({ getUsers }) });

      const users = await fetcher.getAccounts(["1", "gone", "2"]);

      expect(users.map((value) => value.id)).toStrictEqual(["1", "2"]);
    });

    it("passes each ID once and leaves batching to the client", async () => {
      const ids = Array.from({ length: 150 }, (_, i) => `${i}`);
      const getUsers = vi.fn<TwitchApi["getUsers"]>(
        ({ ids }: { ids: string[] }) =>
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

      await expect(fetcher.getAccounts([])).resolves.toStrictEqual([]);
      expect(client.getUsers).not.toHaveBeenCalled();
    });
  });

  describe("getLiveStreams", () => {
    it("returns the streams that are live", async () => {
      const getStreamsByUserIds = vi.fn<TwitchApi["getStreamsByUserIds"]>(() =>
        fromArray([createStream({ id: "s1" })])
      );
      const fetcher = new TwitchFetcher({
        client: createClient({ getStreamsByUserIds }),
      });

      const streams = await fetcher.getLiveStreams(["user-1", "user-2"]);

      expect(streams.map((value) => value.id)).toStrictEqual(["s1"]);
      expect(getStreamsByUserIds).toHaveBeenCalledWith({
        schedule: expect.any(Function),
        userIds: ["user-1", "user-2"],
      });
    });
  });

  describe("getRecentVideos", () => {
    it("lists archives of every broadcaster by default", async () => {
      const getVideosByUser = vi.fn<TwitchApi["getVideosByUser"]>(
        ({ userId }: { userId: string }) =>
          fromArray([createVideo({ id: `${userId}-v1`, user_id: userId })])
      );
      const fetcher = new TwitchFetcher({
        client: createClient({ getVideosByUser }),
      });

      const result = await fetcher.getRecentVideos(["user-1", "user-2"]);

      expect(result.failures).toStrictEqual([]);
      expect(result.videos.map((value) => value.id)).toStrictEqual([
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
      const getVideosByUser = vi.fn<TwitchApi["getVideosByUser"]>(() =>
        fromArray<TwitchVideo>([])
      );
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
      const getVideosByUser = vi.fn<TwitchApi["getVideosByUser"]>(
        ({ userId }: { userId: string }) => {
          if (userId === "user-1") {
            throw error;
          }

          return fromArray([createVideo({ id: "v2", user_id: userId })]);
        }
      );
      const logger = {
        debug: vi.fn<Logger["debug"]>(),
        error: vi.fn<Logger["error"]>(),
        info: vi.fn<Logger["info"]>(),
        warn: vi.fn<Logger["warn"]>(),
      };
      const fetcher = new TwitchFetcher({
        client: createClient({ getVideosByUser }),
        logger,
      });

      const result = await fetcher.getRecentVideos(["user-1", "user-2"]);

      expect(result.videos.map((value) => value.id)).toStrictEqual(["v2"]);
      expect(result.failures).toStrictEqual([{ accountId: "user-1", error }]);
      expect(logger.error).toHaveBeenCalledOnce();
    });

    it("never runs more requests than the concurrency limit", async () => {
      let running = 0;
      let peak = 0;
      const getVideosByUser = vi.fn<TwitchApi["getVideosByUser"]>(
        async function* () {
          running++;
          peak = Math.max(peak, running);
          await new Promise((resolve) => setTimeout(resolve, 5));
          running--;
          yield* [] as TwitchVideo[];
        }
      );
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
      const getVideos = vi.fn<TwitchApi["getVideos"]>(
        ({ ids }: { ids: string[] }) =>
          fromArray(
            ids.filter((id) => id !== "gone").map((id) => createVideo({ id }))
          )
      );
      const fetcher = new TwitchFetcher({
        client: createClient({ getVideos }),
      });

      const result = await fetcher.getVideos(["v1", "gone", "v2"]);

      expect(result.videos.map((value) => value.id)).toStrictEqual([
        "v1",
        "v2",
      ]);
      expect(result.missingIds).toStrictEqual(["gone"]);
    });

    it("makes each request within the concurrency limit", async () => {
      let running = 0;
      let peak = 0;
      // Like the Helix client: every batch at once, each through `schedule`.
      const getVideos = vi.fn<TwitchApi["getVideos"]>(async function* ({
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
      const getVideos = vi.fn<TwitchApi["getVideos"]>(() => {
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
      const getClips = vi.fn<TwitchApi["getClips"]>(
        ({ ids }: { ids: string[] }) =>
          fromArray(
            ids.filter((id) => id !== "gone").map((id) => createClip({ id }))
          )
      );
      const fetcher = new TwitchFetcher({ client: createClient({ getClips }) });

      const result = await fetcher.getClips(["c1", "gone"]);

      expect(result.clips.map((value) => value.id)).toStrictEqual(["c1"]);
      expect(result.missingIds).toStrictEqual(["gone"]);
    });
  });
});
