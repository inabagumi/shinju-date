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
const scraper = { addNewVideos: vi.fn<Scraper["addNewVideos"]>() };
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
  new NextRequest(`http://localhost:5000/videos/update${search}`, {
    method: "POST",
  });

describe("POST /videos/update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acquireLock.mockResolvedValue("lock-value");
    scraper.addNewVideos.mockResolvedValue(false);
  });

  it("adds new YouTube videos by default", async () => {
    scraper.addNewVideos.mockResolvedValue(true);

    const response = await POST(createRequest());

    expect(response.status).toBe(204);
    expect(acquireLock).toHaveBeenCalledWith("videos:update", 130);
    expect(createScraper).toHaveBeenCalledWith("youtube");
    expect(scraper.addNewVideos).toHaveBeenCalledOnce();
    expect(finishVideoSync).toHaveBeenCalledWith(
      expect.objectContaining({ changed: true })
    );
  });

  it("adds new Twitch videos for provider=twitch", async () => {
    const response = await POST(createRequest("?provider=twitch"));

    expect(response.status).toBe(204);
    expect(acquireLock).toHaveBeenCalledWith(
      "videos:update:provider=twitch",
      130
    );
    expect(createScraper).toHaveBeenCalledWith("twitch");
    expect(finishVideoSync).toHaveBeenCalledWith(
      expect.objectContaining({ changed: false })
    );
  });

  it("stamps the videos and the last sync with the same time", async () => {
    await POST(createRequest());

    const [now] = scraper.addNewVideos.mock.calls[0] ?? [];

    expect(now).toBeDefined();
    expect(finishVideoSync).toHaveBeenCalledWith(
      expect.objectContaining({ now })
    );
  });

  it("rejects an unknown provider", async () => {
    const response = await POST(createRequest("?provider=niconico"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toStrictEqual({
      error: expect.stringMatching(/^Invalid query parameters\. provider: /),
    });
    expect(acquireLock).not.toHaveBeenCalled();
    expect(createScraper).not.toHaveBeenCalled();
  });

  it("answers 500 when the crawl fails", async () => {
    scraper.addNewVideos.mockRejectedValue(new Error("quota exceeded"));

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
    expect(finishVideoSync).not.toHaveBeenCalled();
  });
});
