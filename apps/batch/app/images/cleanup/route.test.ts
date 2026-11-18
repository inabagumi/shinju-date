import { beforeEach, describe, expect, it, vi } from "vitest";

const acquireLock = vi.fn();
const releaseLock = vi.fn();
const scraper = { cleanUpImages: vi.fn() };
const createScraper = vi.fn(() => scraper);

vi.mock("@/lib/lock", () => ({ acquireLock, releaseLock }));
vi.mock("@/lib/scraper", () => ({ createScraper }));

vi.mock("@shinju-date/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@sentry/nextjs", () => ({
  captureCheckIn: vi.fn(() => "check-in-id"),
  captureException: vi.fn(),
  flush: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn((callback: () => unknown) => callback()),
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
