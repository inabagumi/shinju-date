import type * as Sentry from "@sentry/nextjs";
import { TIME_ZONE } from "@shinju-date/constants";
import type * as DashboardStats from "@shinju-date/dashboard-stats";
import type {
  AnalyticsSummary,
  SummaryStats,
} from "@shinju-date/dashboard-stats";
import type { Redis } from "@upstash/redis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as Lock from "@/lib/lock";
import type { TypedSupabaseClient } from "@/lib/supabase";

const { createAfterMock, createLoggerMock } = await vi.hoisted(
  () => import("@/test/mocks")
);

const mockSupabaseClient = {
  from: vi.fn<TypedSupabaseClient["from"]>(),
} as Partial<TypedSupabaseClient> as TypedSupabaseClient;

const mockRedisClient = {
  set: vi.fn<Redis["set"]>(),
};

const acquireLock = vi.fn<typeof Lock.acquireLock>();
const releaseLock = vi.fn<typeof Lock.releaseLock>();

const mockCountSummaryStats = vi.fn<typeof DashboardStats.countSummaryStats>();
const mockCollectAnalyticsSummary =
  vi.fn<typeof DashboardStats.collectAnalyticsSummary>();

vi.mock(import("@/lib/supabase"), () => ({
  supabaseClient: mockSupabaseClient,
}));

vi.mock(import("@/lib/redis"), () => ({
  redisClient: mockRedisClient as Partial<Redis> as Redis,
}));

vi.mock(import("@/lib/lock"), () => ({ acquireLock, releaseLock }));

// The counts and the analytics are tested in `@shinju-date/dashboard-stats`.
// The snapshots are written by the real functions of the package, so that the
// keys and the values saved to Redis are checked here.
vi.mock(import("@shinju-date/dashboard-stats"), async (importOriginal) => ({
  ...(await importOriginal()),
  collectAnalyticsSummary: mockCollectAnalyticsSummary,
  countSummaryStats: mockCountSummaryStats,
}));

vi.mock(import("@sentry/nextjs"), () => ({
  captureCheckIn: vi.fn<typeof Sentry.captureCheckIn>(() => "mock-check-in-id"),
  captureException: vi.fn<typeof Sentry.captureException>(),
  flush: vi.fn<typeof Sentry.flush>(),
}));

vi.mock(import("@shinju-date/logger"), () => ({
  logger: createLoggerMock(),
}));

vi.mock(import("next/server"), () => ({ after: createAfterMock() }));

const summaryStats: SummaryStats = {
  deletedVideos: 10,
  hiddenVideos: 20,
  scheduledVideos: 5,
  totalTalents: 25,
  totalTerms: 50,
  totalVideos: 100,
  visibleVideos: 80,
};

const analyticsSummary: AnalyticsSummary = {
  recentClicks: 30,
  recentSearches: 150,
  totalPopularKeywords: 25,
};

// Written out here, so that a change of the TTLs in the package fails here
const SUMMARY_SNAPSHOT_TTL_SECONDS = 45 * 24 * 60 * 60;
const ANALYTICS_SNAPSHOT_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Run the route as if it is `instant` now. */
const runAt = async (instant: string): Promise<Response> => {
  vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockImplementation(
    (timeZone = TIME_ZONE) =>
      Temporal.Instant.from(instant).toZonedDateTimeISO(timeZone)
  );

  const { POST } = await import("./route");

  return POST(
    new Request("http://localhost:3000/stats/snapshot", {
      method: "POST",
    })
  );
};

describe("stats/snapshot route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    acquireLock.mockResolvedValue("lock-value");
    mockRedisClient.set.mockResolvedValue("OK");
    mockCountSummaryStats.mockResolvedValue(summaryStats);
    mockCollectAnalyticsSummary.mockResolvedValue(analyticsSummary);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("target day", () => {
    it("counts the previous day in Japan as of its end", async () => {
      // 2025-11-13 00:05 JST
      await runAt("2025-11-12T15:05:00Z");

      expect(mockCountSummaryStats).toHaveBeenCalledWith(mockSupabaseClient, {
        asOf: Temporal.Instant.from("2025-11-12T15:00:00Z"),
      });
      expect(mockCollectAnalyticsSummary).toHaveBeenCalledWith(
        mockRedisClient,
        "20251112"
      );
    });

    it("uses the day in Japan even when the day in UTC is different", async () => {
      // 2025-11-13 23:30 JST, which is still 2025-11-13 in UTC
      await runAt("2025-11-13T14:30:00Z");

      expect(mockCountSummaryStats).toHaveBeenCalledWith(mockSupabaseClient, {
        asOf: Temporal.Instant.from("2025-11-12T15:00:00Z"),
      });
      expect(mockCollectAnalyticsSummary).toHaveBeenCalledWith(
        mockRedisClient,
        "20251112"
      );
    });
  });

  describe("day boundaries", () => {
    it.each([
      // 2025-11-13 00:00:00 JST, the first moment of the day
      [
        "at the start of a day",
        "2025-11-12T15:00:00Z",
        "20251112",
        "2025-11-12T15:00:00Z",
      ],
      // 2025-11-13 23:59:59.999 JST, the last moment of the day
      [
        "at the end of a day",
        "2025-11-13T14:59:59.999Z",
        "20251112",
        "2025-11-12T15:00:00Z",
      ],
      // 2025-11-12 23:59:59.999 JST, just before the boundary above
      [
        "just before a day starts",
        "2025-11-12T14:59:59.999Z",
        "20251111",
        "2025-11-11T15:00:00Z",
      ],
      // 2026-01-01 00:10 JST
      [
        "across a year",
        "2025-12-31T15:10:00Z",
        "20251231",
        "2025-12-31T15:00:00Z",
      ],
      // 2028-03-01 00:10 JST
      [
        "after a leap day",
        "2028-02-29T15:10:00Z",
        "20280229",
        "2028-02-29T15:00:00Z",
      ],
    ])("saves the previous day %s", async (_, instant, dateKey, asOf) => {
      await runAt(instant);

      expect(mockCountSummaryStats).toHaveBeenCalledWith(mockSupabaseClient, {
        asOf: Temporal.Instant.from(asOf),
      });
      expect(mockCollectAnalyticsSummary).toHaveBeenCalledWith(
        mockRedisClient,
        dateKey
      );
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `summary:stats:${dateKey}`,
        summaryStats,
        { ex: SUMMARY_SNAPSHOT_TTL_SECONDS }
      );
    });
  });

  describe("snapshots", () => {
    it("saves the counts and the analytics under the keys of the day", async () => {
      await runAt("2025-11-12T15:05:00Z");

      expect(mockRedisClient.set).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "summary:stats:20251112",
        summaryStats,
        { ex: SUMMARY_SNAPSHOT_TTL_SECONDS }
      );
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "summary:analytics:20251112",
        analyticsSummary,
        { ex: ANALYTICS_SNAPSHOT_TTL_SECONDS }
      );
    });

    // The day is left without the snapshots (a missing day on the dashboard),
    // rather than with the counts but without the analytics
    it("saves neither snapshot when the analytics cannot be collected", async () => {
      mockCollectAnalyticsSummary.mockRejectedValue(new Error("Redis error"));

      const response = await runAt("2025-11-12T15:05:00Z");

      expect(response.status).toBe(500);
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });
  });

  describe("reporting", () => {
    it("responds with 204 and reports the run as ok", async () => {
      const Sentry = await import("@sentry/nextjs");

      const response = await runAt("2025-11-12T15:05:00Z");

      expect(response.status).toBe(204);
      expect(acquireLock).toHaveBeenCalledWith("stats:snapshot", 70);
      expect(releaseLock).toHaveBeenCalledWith("stats:snapshot", "lock-value");
      expect(Sentry.captureCheckIn).toHaveBeenLastCalledWith({
        checkInId: "mock-check-in-id",
        monitorSlug: "/stats/snapshot",
        status: "ok",
      });
    });

    it("responds with 500 and reports the error when the snapshot fails", async () => {
      const Sentry = await import("@sentry/nextjs");
      const error = new Error("Database error");

      mockCountSummaryStats.mockRejectedValue(error);

      const response = await runAt("2025-11-12T15:05:00Z");

      expect(response.status).toBe(500);
      expect(mockRedisClient.set).not.toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
      expect(Sentry.captureCheckIn).toHaveBeenLastCalledWith({
        checkInId: "mock-check-in-id",
        monitorSlug: "/stats/snapshot",
        status: "error",
      });
    });
  });
});
