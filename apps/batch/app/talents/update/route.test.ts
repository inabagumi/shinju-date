import type * as Sentry from "@sentry/nextjs";
import type { Scraper } from "@shinju-date/scraper";
import type * as WebCache from "@shinju-date/web-cache";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as Lock from "@/lib/lock";
import type * as ScraperModule from "@/lib/scraper";

const { createAfterMock, createLoggerMock } = await vi.hoisted(
  () => import("@/test/mocks")
);

const acquireLock = vi.fn<typeof Lock.acquireLock>();
const releaseLock = vi.fn<typeof Lock.releaseLock>();
const scraper = { syncAccounts: vi.fn<Scraper["syncAccounts"]>() };
const createScraper = vi.fn<typeof ScraperModule.createScraper>(
  () => scraper as Partial<Scraper> as Scraper
);
const revalidateTags = vi.fn<typeof WebCache.revalidateTags>();

vi.mock(import("@/lib/lock"), () => ({ acquireLock, releaseLock }));
vi.mock(import("@/lib/scraper"), () => ({ createScraper }));
vi.mock(import("@shinju-date/web-cache"), () => ({ revalidateTags }));

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
  new NextRequest(`http://localhost:5000/talents/update${search}`, {
    method: "POST",
  });

describe("POST /talents/update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acquireLock.mockResolvedValue("lock-value");
    scraper.syncAccounts.mockResolvedValue(false);
  });

  it("syncs YouTube channels by default", async () => {
    const response = await POST(createRequest());

    expect(response.status).toBe(204);
    expect(acquireLock).toHaveBeenCalledWith("talents:update", 130);
    expect(createScraper).toHaveBeenCalledWith("youtube");
    expect(scraper.syncAccounts).toHaveBeenCalledOnce();
    expect(revalidateTags).not.toHaveBeenCalled();
  });

  it("syncs Twitch users for provider=twitch", async () => {
    scraper.syncAccounts.mockResolvedValue(true);

    const response = await POST(createRequest("?provider=twitch"));

    expect(response.status).toBe(204);
    expect(acquireLock).toHaveBeenCalledWith(
      "talents:update:provider=twitch",
      130
    );
    expect(createScraper).toHaveBeenCalledWith("twitch");
    expect(revalidateTags).toHaveBeenCalledWith(["talents"], expect.anything());
  });

  it("rejects an unknown provider", async () => {
    const response = await POST(createRequest("?provider=niconico"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toStrictEqual({
      error: expect.stringMatching(/^Invalid query parameters\. provider: /u),
    });
    expect(createScraper).not.toHaveBeenCalled();
  });
});
