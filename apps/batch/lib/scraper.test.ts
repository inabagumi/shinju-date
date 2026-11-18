import type * as Sentry from "@sentry/nextjs";
import type { TwitchScraper as RealTwitchScraper } from "@shinju-date/scraper/twitch";
import type { YouTubeScraper as RealYouTubeScraper } from "@shinju-date/scraper/youtube";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TypedSupabaseClient } from "./supabase";

const { createLoggerMock } = await vi.hoisted(() => import("@/test/mocks"));

const supabaseClient =
  {} as Partial<TypedSupabaseClient> as TypedSupabaseClient;
const logger = createLoggerMock();
const captureException = vi.fn<typeof Sentry.captureException>();
const YouTubeScraper = vi.fn<typeof RealYouTubeScraper>();
const TwitchScraper = vi.fn<typeof RealTwitchScraper>();

vi.mock(import("@/lib/supabase"), () => ({ supabaseClient }));
vi.mock(import("@shinju-date/logger"), () => ({ logger }));
vi.mock(import("@sentry/nextjs"), () => ({ captureException }));
vi.mock(import("@shinju-date/scraper/youtube"), () => ({ YouTubeScraper }));
vi.mock(import("@shinju-date/scraper/twitch"), () => ({ TwitchScraper }));

const { createScraper } = await import("./scraper");

describe("createScraper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["youtube", YouTubeScraper],
    ["twitch", TwitchScraper],
  ] as const)("creates the %s scraper", (provider, Scraper) => {
    const scraper = createScraper(provider);

    expect(Scraper.mock.instances).toHaveLength(1);
    expect(Scraper.mock.instances[0]).toBe(scraper);
    expect(Scraper.mock.calls[0]?.[0].supabaseClient).toBe(supabaseClient);
    expect(Scraper.mock.calls[0]?.[0].logger).toBe(logger);
  });

  it("sends failures that do not stop a run to Sentry", () => {
    createScraper("twitch");
    const error = new Error("helix unavailable");

    TwitchScraper.mock.calls[0]?.[0].onError?.(error, {
      twitchUserId: "1001",
    });

    expect(captureException).toHaveBeenCalledWith(error, {
      extra: { provider: "twitch", twitchUserId: "1001" },
    });
  });
});
