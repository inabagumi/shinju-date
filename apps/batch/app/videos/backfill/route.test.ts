import type * as Sentry from "@sentry/nextjs";
import type { Scraper } from "@shinju-date/scraper";
import {
  BACKFILL_LEASE_MARGIN_SECONDS,
  getRunResultKey,
} from "@shinju-date/video-backfill";
import type { BackfillJob, BackfillQueue } from "@shinju-date/video-backfill";
import { FakeRedis } from "@shinju-date/video-backfill/testing";
import type * as WebCache from "@shinju-date/web-cache";
import type { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as Lock from "@/lib/lock";
import type { OncePerWindowLimiter } from "@/lib/ratelimit";
import type * as ScraperModule from "@/lib/scraper";
import type { TypedSupabaseClient } from "@/lib/supabase";
import type * as VideoBackfill from "@/lib/video-backfill";
import type { WorkOffBackfillQueueOptions } from "@/lib/video-backfill";
import type * as VideoBackfillHistory from "@/lib/video-backfill-history";

const { createAfterMock, createLoggerMock } = await vi.hoisted(
  () => import("@/test/mocks")
);

const acquireLock = vi.fn<typeof Lock.acquireLock>();
const limit = vi.fn<OncePerWindowLimiter["limit"]>();
const createScraper = vi.fn<typeof ScraperModule.createScraper>(
  () => ({ provider: "youtube" }) as Partial<Scraper> as Scraper
);
const revalidateTags = vi.fn<typeof WebCache.revalidateTags>();
const workOffBackfillQueue = vi.fn<typeof VideoBackfill.workOffBackfillQueue>();
const recordBackfillJob =
  vi.fn<typeof VideoBackfillHistory.recordBackfillJob>();
const supabaseClient = {
  from: vi.fn<TypedSupabaseClient["from"]>(),
} as Partial<TypedSupabaseClient> as TypedSupabaseClient;
const redisClient = new FakeRedis();

vi.mock(import("@/lib/lock"), () => ({ acquireLock }));
vi.mock(import("@/lib/ratelimit"), () => ({ videosBackfill: { limit } }));
vi.mock(import("@/lib/redis"), () => ({
  redisClient: redisClient as Partial<Redis> as Redis,
}));
vi.mock(import("@/lib/scraper"), () => ({ createScraper }));
vi.mock(import("@/lib/supabase"), () => ({ supabaseClient }));
vi.mock(import("@/lib/video-backfill"), () => ({ workOffBackfillQueue }));
vi.mock(import("@/lib/video-backfill-history"), () => ({ recordBackfillJob }));
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

const { POST, maxDuration } = await import("./route");

/** The options the route passed to `workOffBackfillQueue`. */
const getQueueOptions = (): WorkOffBackfillQueueOptions => {
  const options = workOffBackfillQueue.mock.lastCall?.[0];

  if (!options) {
    throw new Error("Expected the queue to be worked off");
  }

  return options;
};

const createRequest = (): NextRequest =>
  new NextRequest("http://localhost:5000/videos/backfill", {
    method: "POST",
  });

describe("POST /videos/backfill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    limit.mockResolvedValue({ success: true });
    workOffBackfillQueue.mockResolvedValue({ added: 0, jobs: 0 });
  });

  it("works off the queue with its own rate limit", async () => {
    const response = await POST(createRequest());

    expect(response.status).toBe(204);
    expect(limit).toHaveBeenCalledWith("videos:backfill");
    // Runs overlap on purpose; each job of the queue has its own lock.
    expect(acquireLock).not.toHaveBeenCalled();
    expect(workOffBackfillQueue).toHaveBeenCalledOnce();
    expect(revalidateTags).not.toHaveBeenCalled();
  });

  it("creates one scraper per provider", async () => {
    await POST(createRequest());

    const { getScraper } = getQueueOptions();

    expect(getScraper("youtube")).toBe(getScraper("youtube"));
    getScraper("twitch");
    expect(createScraper.mock.calls).toStrictEqual([["youtube"], ["twitch"]]);
  });

  it("locks each job for as long as the run may last", async () => {
    await POST(createRequest());

    const { queue } = getQueueOptions();

    expect(queue.leaseSeconds).toBe(
      maxDuration + BACKFILL_LEASE_MARGIN_SECONDS
    );
  });

  it("records the jobs that finish in the history", async () => {
    await POST(createRequest());

    const { onFinish } = getQueueOptions();
    const job = {
      id: "youtube:channel-row-1",
      status: "done",
    } as Partial<BackfillJob> as BackfillJob;

    await onFinish?.(job);

    expect(recordBackfillJob).toHaveBeenCalledWith(supabaseClient, job);
  });

  it("keeps the outcome of a job of a check when it finishes", async () => {
    await POST(createRequest());

    const queue: BackfillQueue = getQueueOptions().queue;

    await queue.enqueue({
      accountId: "channel-row-1",
      provider: "youtube",
      requestedBy: null,
      runId: "run-1",
      talentId: "talent-1",
    });

    const claimed = await queue.claim();

    if (!claimed) {
      throw new Error("Expected a job to claim");
    }

    const finished = await queue.recordPage(claimed, {
      added: 0,
      done: true,
      nextCursor: null,
    });

    expect(finished.status).toBe("saved");
    await expect(
      redisClient.get(getRunResultKey("run-1", claimed.job.id))
    ).resolves.toStrictEqual(finished.status === "saved" && finished.job);
  });

  it("refreshes the public site after videos were added", async () => {
    workOffBackfillQueue.mockResolvedValue({ added: 3, jobs: 1 });

    await POST(createRequest());

    expect(revalidateTags).toHaveBeenCalledWith(["videos"], expect.anything());
  });

  it("does not run again right after the previous run", async () => {
    limit.mockResolvedValue({ success: false });

    const response = await POST(createRequest());

    expect(response.status).toBe(429);
    expect(workOffBackfillQueue).not.toHaveBeenCalled();
  });

  it("reports a run that fails", async () => {
    workOffBackfillQueue.mockRejectedValue(new Error("redis unavailable"));

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
  });
});
