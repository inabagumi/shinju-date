import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const acquireLock = vi.fn();
const releaseLock = vi.fn();
const scraper = { addNewVideos: vi.fn() };
const createScraper = vi.fn(() => scraper);
const finishVideoSync = vi.fn();

vi.mock("@/lib/lock", () => ({ acquireLock, releaseLock }));
vi.mock("@/lib/scraper", () => ({ createScraper }));
vi.mock("@/lib/video-sync", () => ({ finishVideoSync }));

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

function createRequest(search = ""): NextRequest {
  return new NextRequest(`http://localhost:5000/videos/update${search}`, {
    method: "POST",
  });
}

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
    await expect(response.json()).resolves.toEqual({
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
