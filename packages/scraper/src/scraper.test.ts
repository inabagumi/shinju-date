import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { Logger } from "./internal/logger.js";
import { postgresError, setupSupabase } from "./internal/testing/supabase.js";
import { Scraper } from "./scraper.js";
import type {
  AddPastVideosResult,
  CrawlContext,
  ErrorReporter,
  RefreshVideoResult,
  ScraperOptions,
  SyncAccountResult,
  TypedSupabaseClient,
} from "./types.js";

const supabaseClient = {} as TypedSupabaseClient;

/**
 * A platform scraper reduced to what the base class provides.
 */
class ExampleScraper extends Scraper {
  readonly provider = "youtube";

  context: CrawlContext<string> | undefined;

  constructor(options: Partial<ScraperOptions> = {}) {
    super({ supabaseClient, ...options });
  }

  addNewVideos(now?: Temporal.Instant): Promise<boolean> {
    this.context = this.createContext("fetcher", now);

    return Promise.resolve(true);
  }

  // oxlint-disable-next-line eslint/class-methods-use-this -- implements an abstract method of Scraper
  addPastVideos(): Promise<AddPastVideosResult> {
    return Promise.resolve({ added: 0, cursor: null, listed: 0 });
  }

  refreshLiveVideos(): Promise<boolean> {
    this.reportError(new Error("one video failed"), { videoId: "v1" });

    return Promise.resolve(false);
  }

  // oxlint-disable-next-line eslint/class-methods-use-this -- implements an abstract method of Scraper
  refreshRecentVideos(): Promise<boolean> {
    return Promise.resolve(false);
  }

  // oxlint-disable-next-line eslint/class-methods-use-this -- implements an abstract method of Scraper
  refreshVideo(): Promise<RefreshVideoResult> {
    return Promise.resolve({ status: "not-found" });
  }

  // oxlint-disable-next-line eslint/class-methods-use-this -- implements an abstract method of Scraper
  removeUnavailableVideos(): Promise<boolean> {
    return Promise.resolve(false);
  }

  // oxlint-disable-next-line eslint/class-methods-use-this -- implements an abstract method of Scraper
  syncAccounts(): Promise<boolean> {
    return Promise.resolve(false);
  }

  // oxlint-disable-next-line eslint/class-methods-use-this -- implements an abstract method of Scraper
  syncTalentAccounts(): Promise<SyncAccountResult[]> {
    return Promise.resolve([]);
  }
}

describe(Scraper, () => {
  it("hands crawl operations what they need for a run", async () => {
    const now = Temporal.Instant.from("2024-05-01T12:00:00Z");
    const scraper = new ExampleScraper();

    await scraper.addNewVideos(now);

    expect(scraper.context).toMatchObject({
      fetcher: "fetcher",
      now,
      supabaseClient,
    });
  });

  it("uses the current time unless a run is given one", async () => {
    const scraper = new ExampleScraper();
    const before = Temporal.Now.instant();

    await scraper.addNewVideos();

    expect(
      Temporal.Instant.compare(scraper.context?.now ?? before, before)
    ).toBeGreaterThanOrEqual(0);
  });

  it("passes failures that do not stop a run to onError", async () => {
    const onError = vi.fn<ErrorReporter>();
    const scraper = new ExampleScraper({ onError });

    await scraper.refreshLiveVideos();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "one video failed" }),
      { videoId: "v1" }
    );
  });

  it("logs such failures when no onError is given", async () => {
    const logger = {
      debug: vi.fn<Logger["debug"]>(),
      error: vi.fn<Logger["error"]>(),
      info: vi.fn<Logger["info"]>(),
      warn: vi.fn<Logger["warn"]>(),
    };
    const scraper = new ExampleScraper({ logger });

    await scraper.refreshLiveVideos();

    expect(logger.error).toHaveBeenCalledWith("Failed to process an item", {
      error: expect.objectContaining({ message: "one video failed" }),
      provider: "youtube",
      videoId: "v1",
    });
  });

  it("works without a logger", async () => {
    const scraper = new ExampleScraper();

    await expect(scraper.refreshLiveVideos()).resolves.toBeFalsy();
  });
});

describe("Scraper#cleanUpImages", () => {
  const supabase = setupSupabase();
  const now = Temporal.Instant.from("2024-05-08T12:00:00Z");

  /** Records the paths removed from each storage bucket. */
  const mockStorage = (): Record<string, string[]> => {
    const removed: Record<string, string[]> = {};

    supabase.server.use(
      http.delete(
        "https://fake.supabase.test/storage/v1/object/:bucket",
        async ({ params, request }) => {
          const { prefixes } = (await request.json()) as { prefixes: string[] };

          removed[String(params["bucket"])] = prefixes;

          return HttpResponse.json([]);
        }
      )
    );

    return removed;
  };

  const createScraper = () => {
    const onError = vi.fn<ErrorReporter>();
    const scraper = new ExampleScraper({
      onError,
      supabaseClient: supabase.supabaseClient,
    });

    return { onError, scraper };
  };

  it("deletes the thumbnails and icons nothing uses, past their grace periods", async () => {
    const removed = mockStorage();
    supabase.respondWith({
      "DELETE profile_images": [],
      "DELETE thumbnails": [{ id: "thumb-1" }],
      "GET profile_images": [{ id: "image-1", path: "twitch/1/a.webp" }],
      "GET thumbnails": [{ id: "thumb-1", path: "vod-1/a.jpg", videos: [] }],
    });
    const { onError, scraper } = createScraper();

    await expect(scraper.cleanUpImages(now)).resolves.toBeUndefined();

    expect(supabase.written("GET", "thumbnails")[0]?.query).toMatchObject({
      updated_at: "lt.2024-05-01T12:00:00Z",
      videos: "is.null",
    });
    expect(supabase.written("GET", "profile_images")[0]?.query).toMatchObject({
      created_at: "lt.2024-05-08T11:00:00Z",
    });
    expect(removed).toStrictEqual({
      "profile-images": ["twitch/1/a.webp"],
      thumbnails: ["vod-1/a.jpg"],
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports a failed clean-up and still cleans up the other kind", async () => {
    const removed = mockStorage();
    supabase.respondWith({
      "GET profile_images": [{ id: "image-1", path: "twitch/1/a.webp" }],
      "GET thumbnails": () => postgresError("57014", "canceling statement"),
    });
    const { onError, scraper } = createScraper();

    await expect(scraper.cleanUpImages(now)).resolves.toBeUndefined();

    expect(onError).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        message: expect.stringContaining("Failed to list unused thumbnails"),
      }),
      { operation: "removeUnusedThumbnails" }
    );
    expect(removed).toStrictEqual({ "profile-images": ["twitch/1/a.webp"] });
  });

  it("never rejects, even when nothing can be cleaned up", async () => {
    supabase.respond(() => postgresError("42501", "permission denied"));
    const { onError, scraper } = createScraper();

    await expect(scraper.cleanUpImages(now)).resolves.toBeUndefined();

    expect(onError.mock.calls.map(([, context]) => context)).toStrictEqual([
      { operation: "removeUnusedThumbnails" },
      { operation: "removeUnusedProfileImages" },
    ]);
  });
});
