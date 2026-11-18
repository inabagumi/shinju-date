import type * as Sentry from "@sentry/nextjs";
import type { Scraper } from "@shinju-date/scraper";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as Lock from "@/lib/lock";
import type * as ScraperModule from "@/lib/scraper";

const { createAfterMock, createLoggerMock } = await vi.hoisted(
  () => import("@/test/mocks")
);

const acquireLock = vi.fn<typeof Lock.acquireLock>();
const releaseLock = vi.fn<typeof Lock.releaseLock>();
const scraper = { cleanUpImages: vi.fn<Scraper["cleanUpImages"]>() };
const createScraper = vi.fn<typeof ScraperModule.createScraper>(
  () => scraper as Partial<Scraper> as Scraper
);

vi.mock(import("@/lib/lock"), () => ({ acquireLock, releaseLock }));
vi.mock(import("@/lib/scraper"), () => ({ createScraper }));

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

function createRequest(): Request {
  return new Request("http://localhost:5000/images/cleanup", {
    method: "POST",
  });
}

describe("POST /images/cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    acquireLock.mockResolvedValue("lock-value");
    scraper.cleanUpImages.mockResolvedValue(undefined);
  });

  it("cleans up the unused images of every platform once", async () => {
    const response = await POST(createRequest());

    expect(response.status).toBe(204);
    expect(acquireLock).toHaveBeenCalledWith("images:cleanup", 70);
    expect(createScraper).toHaveBeenCalledOnce();
    expect(scraper.cleanUpImages).toHaveBeenCalledOnce();
  });

  it("does not run while the previous run holds the lock", async () => {
    acquireLock.mockResolvedValue(null);

    const response = await POST(createRequest());

    expect(response.status).toBe(429);
    expect(scraper.cleanUpImages).not.toHaveBeenCalled();
  });

  it("answers 500 when the clean-up cannot run at all", async () => {
    scraper.cleanUpImages.mockRejectedValue(new Error("unexpected"));

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
  });
});
