import type * as Sentry from "@sentry/nextjs";
import type { Scraper } from "@shinju-date/scraper";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as Lock from "@/lib/lock";
import type * as ScraperModule from "@/lib/scraper";
import type * as VideoSync from "@/lib/video-sync";

const { createAfterMock, createLoggerMock } = await vi.hoisted(
  () => import("@/test/mocks")
);

const acquireLock = vi.fn<typeof Lock.acquireLock>();
const releaseLock = vi.fn<typeof Lock.releaseLock>();
const scraper = {
  refreshLiveVideos: vi.fn<Scraper["refreshLiveVideos"]>(),
  refreshRecentVideos: vi.fn<Scraper["refreshRecentVideos"]>(),
  removeUnavailableVideos: vi.fn<Scraper["removeUnavailableVideos"]>(),
};
const createScraper = vi.fn<typeof ScraperModule.createScraper>(
  () => scraper as Partial<Scraper> as Scraper
);
const finishVideoSync = vi.fn<typeof VideoSync.finishVideoSync>();

vi.mock(import("@/lib/lock"), () => ({ acquireLock, releaseLock }));
vi.mock(import("@/lib/scraper"), () => ({ createScraper }));
vi.mock(import("@/lib/video-sync"), () => ({ finishVideoSync }));

vi.mock(import("@shinju-date/logger"), () => ({
  logger: createLoggerMock(),
}));

vi.mock(import("@sentry/nextjs"), () => ({
  captureCheckIn: vi.fn<typeof Sentry.captureCheckIn>(() => "check-in-id"),
  captureException: vi.fn<typeof Sentry.captureException>(),
  flush: vi.fn<typeof Sentry.flush>(),
}));

vi.mock(import("next/server"), async (importOriginal) => ({
  ...(await importOriginal()),
  after: createAfterMock(),
}));

const { POST } = await import("./route");

const createRequest = (search = ""): NextRequest =>
  new NextRequest(`http://localhost:5000/videos/check${search}`, {
    method: "POST",
  });

describe("POST /videos/check", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    acquireLock.mockResolvedValue("lock-value");

    for (const operation of Object.values(scraper)) {
      operation.mockResolvedValue(false);
    }
  });

  it.each([
    ["", "youtube", "refreshLiveVideos", "videos:check"],
    [
      "?mode=recent",
      "youtube",
      "refreshRecentVideos",
      "videos:check:mode=recent",
    ],
    [
      "?mode=all",
      "youtube",
      "removeUnavailableVideos",
      "videos:check:mode=all",
    ],
    [
      "?provider=twitch",
      "twitch",
      "refreshLiveVideos",
      "videos:check:provider=twitch",
    ],
    [
      "?provider=twitch&mode=recent",
      "twitch",
      "refreshRecentVideos",
      "videos:check:mode=recent:provider=twitch",
    ],
    [
      "?provider=twitch&mode=all",
      "twitch",
      "removeUnavailableVideos",
      "videos:check:mode=all:provider=twitch",
    ],
  ] as const)(
    "%s runs %s.%s",
    async (search, provider, operation, identifier) => {
      const response = await POST(createRequest(search));

      expect(response.status).toBe(204);
      expect(acquireLock).toHaveBeenCalledWith(identifier, 130);
      expect(createScraper).toHaveBeenCalledWith(provider);

      for (const [name, mock] of Object.entries(scraper)) {
        expect(mock).toHaveBeenCalledTimes(name === operation ? 1 : 0);
      }
    }
  );

  it("reports whether anything changed", async () => {
    scraper.refreshLiveVideos.mockResolvedValue(true);

    await POST(createRequest("?provider=twitch"));

    expect(finishVideoSync).toHaveBeenCalledWith(
      expect.objectContaining({ changed: true })
    );
  });

  it("rejects an unknown provider", async () => {
    const response = await POST(createRequest("?provider=niconico"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toStrictEqual({
      error: expect.stringMatching(/^Invalid query parameters\. provider: /),
    });
    expect(createScraper).not.toHaveBeenCalled();
  });

  it("rejects an unknown mode", async () => {
    const response = await POST(createRequest("?mode=everything"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toStrictEqual({
      error: expect.stringMatching(/^Invalid query parameters\. mode: /),
    });
    expect(createScraper).not.toHaveBeenCalled();
  });

  it("answers 500 when the check fails", async () => {
    scraper.refreshLiveVideos.mockRejectedValue(new Error("quota exceeded"));

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
    expect(finishVideoSync).not.toHaveBeenCalled();
  });
});
