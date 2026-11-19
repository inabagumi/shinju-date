// oxlint-disable-next-line eslint/max-classes-per-file -- the fetchers of the tests are small subclasses of the example fetcher
import { setTimeout as delay } from "node:timers/promises";

import { describe, expect, it, vi } from "vitest";

import type {
  FetcherOptions,
  RecentVideosResult,
  VideoLookupResult,
} from "./fetcher-types.js";
import { Fetcher, fetchByIds } from "./fetcher.js";
import type { Logger } from "./logger.js";

interface Account {
  id: string;
  name: string;
}

interface Video {
  id: string;
  title: string;
}

interface Platform {
  /** Account ID → IDs of its videos, or an error to throw when listing. */
  accounts: Record<string, string[] | Error>;
  /** IDs of the videos that still exist. */
  videoIds: string[];
}

/**
 * The smallest possible platform fetcher: only the three abstract methods are
 * implemented, on top of the helpers the base class provides.
 */
class ExampleFetcher extends Fetcher<Account, Video> {
  readonly provider = "youtube";

  readonly requests: string[][] = [];
  readonly #platform: Platform;

  constructor(platform: Platform, options?: FetcherOptions) {
    super(options);

    this.#platform = platform;
  }

  async *#lookUp<T>(ids: string[], known: string[], create: (id: string) => T) {
    this.requests.push(ids);

    for (const id of ids) {
      if (known.includes(id)) {
        yield create(id);
      }
    }
  }

  async getAccounts(accountIds: readonly string[]): Promise<Account[]> {
    const { found } = await fetchByIds(accountIds, (ids) =>
      this.#lookUp(ids, Object.keys(this.#platform.accounts), (id) => ({
        id,
        name: `Account ${id}`,
      }))
    );

    return found;
  }

  async getRecentVideos(
    accountIds: readonly string[]
  ): Promise<RecentVideosResult<Video>> {
    const { failures, results } = await this.fetchPerAccount(
      accountIds,
      (accountId) => {
        const videoIds = this.#platform.accounts[accountId] ?? [];

        if (videoIds instanceof Error) {
          return Promise.reject(videoIds);
        }

        return Promise.resolve(
          videoIds.map((id) => ({ id, title: `Video ${id}` }))
        );
      }
    );

    return { failures, videos: results.flatMap(({ value }) => value) };
  }

  async getVideos(
    videoIds: readonly string[]
  ): Promise<VideoLookupResult<Video>> {
    const { found, missingIds } = await fetchByIds(videoIds, (ids) =>
      this.#lookUp(ids, this.#platform.videoIds, (id) => ({
        id,
        title: `Video ${id}`,
      }))
    );

    return { missingIds, videos: found };
  }
}

describe(Fetcher, () => {
  describe("lookups by ID", () => {
    it("passes each ID once and leaves batching to the API client", async () => {
      const fetcher = new ExampleFetcher({
        accounts: {},
        videoIds: ["v1", "v2", "v3"],
      });

      const result = await fetcher.getVideos(["v1", "v2", "v1", "v3", "v2"]);

      expect(result.videos.map((video) => video.id)).toStrictEqual([
        "v1",
        "v2",
        "v3",
      ]);
      expect(fetcher.requests).toStrictEqual([["v1", "v2", "v3"]]);
    });

    it("reports the IDs the platform did not return", async () => {
      const fetcher = new ExampleFetcher({ accounts: {}, videoIds: ["v1"] });

      await expect(fetcher.getVideos(["v1", "gone"])).resolves.toStrictEqual({
        missingIds: ["gone"],
        videos: [{ id: "v1", title: "Video v1" }],
      });
    });

    it("makes no request without IDs", async () => {
      const fetcher = new ExampleFetcher({ accounts: {}, videoIds: [] });

      await expect(fetcher.getAccounts([])).resolves.toStrictEqual([]);
      expect(fetcher.requests).toStrictEqual([]);
    });
  });

  describe("getRecentVideos", () => {
    it("keeps the accounts that worked when one fails", async () => {
      const error = new Error("rate limited");
      const fetcher = new ExampleFetcher({
        accounts: { a: error, b: ["v3"] },
        videoIds: ["v3"],
      });

      const result = await fetcher.getRecentVideos(["a", "b"]);

      expect(result.failures).toStrictEqual([{ accountId: "a", error }]);
      expect(result.videos).toStrictEqual([{ id: "v3", title: "Video v3" }]);
    });
  });

  describe("failures", () => {
    it("logs the account and platform of a failed listing", async () => {
      const error = new Error("rate limited");
      const logger = {
        debug: vi.fn<Logger["debug"]>(),
        error: vi.fn<Logger["error"]>(),
        info: vi.fn<Logger["info"]>(),
        warn: vi.fn<Logger["warn"]>(),
      };

      const fetcher = new ExampleFetcher(
        { accounts: { a: error }, videoIds: [] },
        { logger }
      );

      await fetcher.getRecentVideos(["a"]);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch data for an account",
        { accountId: "a", error, provider: "youtube" }
      );
    });

    it("rejects a lookup when a request fails", async () => {
      class FailingFetcher extends ExampleFetcher {
        // oxlint-disable-next-line eslint/class-methods-use-this -- overrides a method of the fetcher
        override async getVideos(
          videoIds: readonly string[]
        ): Promise<VideoLookupResult<Video>> {
          const { found, missingIds } = await fetchByIds(
            videoIds,
            // oxlint-disable-next-line require-yield -- a request that fails yields nothing
            async function* failingRequest(): AsyncGenerator<Video> {
              throw new Error("boom");
            }
          );

          return { missingIds, videos: found };
        }
      }

      const fetcher = new FailingFetcher({ accounts: {}, videoIds: [] });

      await expect(fetcher.getVideos(["v1"])).rejects.toThrow("boom");
    });
  });

  describe("concurrency", () => {
    it("is shared by every method of a fetcher", async () => {
      let running = 0;
      let peak = 0;
      const task = async () => {
        running += 1;
        peak = Math.max(peak, running);
        await delay(5);
        running -= 1;
      };

      class SlowFetcher extends ExampleFetcher {
        override async getRecentVideos(
          accountIds: readonly string[]
        ): Promise<RecentVideosResult<Video>> {
          const { failures } = await this.fetchPerAccount(accountIds, task);

          return { failures, videos: [] };
        }

        override async getVideos(
          videoIds: readonly string[]
        ): Promise<VideoLookupResult<Video>> {
          // Like an API client handed `request` as its `schedule`.
          await Promise.all(videoIds.map(() => this.request(task)));

          return { missingIds: [], videos: [] };
        }
      }

      const fetcher = new SlowFetcher(
        { accounts: {}, videoIds: [] },
        { concurrency: 2 }
      );

      await Promise.all([
        fetcher.getRecentVideos(["a", "b", "c"]),
        fetcher.getVideos(["v1", "v2", "v3"]),
      ]);

      expect(peak).toBe(2);
    });
  });
});
