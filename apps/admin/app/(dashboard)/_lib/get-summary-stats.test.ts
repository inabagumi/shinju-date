import { isDeepStrictEqual } from "node:util";

import { REDIS_KEYS, TIME_ZONE } from "@shinju-date/constants";
import type { SummaryStats } from "@shinju-date/dashboard-stats";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRedisClient } from "@/lib/redis";
import type {
  createSupabaseServerClient,
  TypedSupabaseClient,
} from "@/lib/supabase";
import { createMockRedisClient } from "@/test/mock-redis-pipeline";
import { postgresError, setupSupabase, withCount } from "@/test/supabase";
import type { SupabaseRequest } from "@/test/supabase";

import { getSummaryStats } from "./get-summary-stats";
import { VIDEO_SUMMARY_FILTERS } from "./video-summary-filters";
import type {
  VideoSummaryFilter,
  VideoSummaryTile,
} from "./video-summary-filters";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn<() => Promise<TypedSupabaseClient>>(),
}));

vi.mock(import("next/cache"), () => ({
  cacheLife: vi.fn<() => void>(),
}));
vi.mock(import("@shinju-date/logger"), async () => {
  const { createMockLogger } = await import("@/test/logger");

  return { logger: createMockLogger() };
});
vi.mock(import("@/lib/supabase"), () => ({
  // Always resolves to the client of the default database
  createSupabaseServerClient:
    mocks.createSupabaseServerClient as typeof createSupabaseServerClient,
}));
vi.mock(import("@/lib/redis"), () => ({
  getRedisClient: vi.fn<typeof getRedisClient>(),
}));

const supabase = setupSupabase();

/** The counts of the database now. */
const current: SummaryStats = {
  deletedVideos: 2,
  hiddenVideos: 1,
  scheduledVideos: 5,
  totalTalents: 12,
  totalTerms: 40,
  totalVideos: 31,
  visibleVideos: 25,
};

/** Read the conditions of a count of the videos back from its request. */
function readVideoFilter({ query }: SupabaseRequest): VideoSummaryFilter {
  const { deleted_at: deletedAt, status, visible } = query;

  if (deletedAt !== "is.null" && deletedAt !== "not.is.null") {
    throw new Error(`Unexpected filter of deleted_at: ${deletedAt}`);
  }

  return {
    deleted: deletedAt === "not.is.null",
    ...(status
      ? {
          status: (status.startsWith("in.(")
            ? status.slice("in.(".length, -1).split(",")
            : [status.replace(/^eq\./, "")]) as NonNullable<
            VideoSummaryFilter["status"]
          >,
        }
      : {}),
    ...(visible ? { visible: visible === "eq.true" } : {}),
  };
}

/**
 * Answer the counts of the videos by the tile whose link lists the same
 * videos. A count with conditions that no tile links to fails the test.
 */
function answerVideoCount(request: SupabaseRequest): Response {
  const filter = readVideoFilter(request);
  const tile = (Object.keys(VIDEO_SUMMARY_FILTERS) as VideoSummaryTile[]).find(
    (key) => isDeepStrictEqual(VIDEO_SUMMARY_FILTERS[key], filter)
  );

  if (!tile) {
    throw new Error(`No tile lists the videos of ${JSON.stringify(filter)}`);
  }

  return withCount([], current[tile]);
}

/** Keep the snapshots of the given days (`YYYYMMDD`) in Redis. */
function mockSnapshots(snapshots: Record<string, unknown> = {}) {
  const get = vi.fn<(key: string) => Promise<unknown>>(
    async (key) =>
      snapshots[key.slice(REDIS_KEYS.SUMMARY_STATS_PREFIX.length)] ?? null
  );

  vi.mocked(getRedisClient).mockReturnValue(createMockRedisClient({ get }));

  return get;
}

describe(getSummaryStats, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseServerClient.mockResolvedValue(supabase.client);

    // 2025-11-13 09:00 in JST
    vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(
      Temporal.Instant.from("2025-11-13T00:00:00Z").toZonedDateTimeISO(
        TIME_ZONE
      )
    );

    supabase.on("select", "videos", answerVideoCount);
    supabase.on("select", "terms", () => withCount([], current.totalTerms));
    supabase.on("select", "talents", () => withCount([], current.totalTalents));
  });

  it("counts each tile with the conditions of the video list it links to", async () => {
    mockSnapshots();

    const result = await getSummaryStats();

    expect(
      Object.fromEntries(
        Object.entries(result).map(([key, trend]) => [key, trend.current])
      )
    ).toStrictEqual(current);
  });

  it("runs one set of the count queries", async () => {
    mockSnapshots();

    await getSummaryStats();

    expect(supabase.requests.map(({ table }) => table).sort()).toStrictEqual([
      "talents",
      "terms",
      "videos",
      "videos",
      "videos",
      "videos",
      "videos",
    ]);
  });

  it("adds the changes from the snapshots of the day before and the week before", async () => {
    const get = mockSnapshots({
      "20251106": { ...current, totalVideos: 20, visibleVideos: 30 },
      "20251112": { ...current, totalVideos: 28 },
    });

    const result = await getSummaryStats();

    expect(get.mock.calls.map(([key]) => key).sort()).toStrictEqual([
      `${REDIS_KEYS.SUMMARY_STATS_PREFIX}20251106`,
      `${REDIS_KEYS.SUMMARY_STATS_PREFIX}20251112`,
    ]);
    expect(result.totalVideos).toStrictEqual({
      current: 31,
      dayChange: 3,
      weekChange: 11,
    });
    expect(result.visibleVideos).toStrictEqual({
      current: 25,
      dayChange: 0,
      weekChange: -5,
    });
  });

  it("has no changes on a day without the snapshots to compare with", async () => {
    mockSnapshots();

    const result = await getSummaryStats();

    for (const trend of Object.values(result)) {
      expect(trend.dayChange).toBeNull();
      expect(trend.weekChange).toBeNull();
    }
    expect(result.totalVideos.current).toBe(31);
  });

  it("has no changes from a snapshot that is not in the form of the counts", async () => {
    const { scheduledVideos: _, ...oldForm } = current;

    mockSnapshots({ "20251106": "broken", "20251112": oldForm });

    const result = await getSummaryStats();

    expect(result.totalVideos).toStrictEqual({
      current: 31,
      dayChange: null,
      weekChange: null,
    });
  });

  it("fails when a count fails, instead of showing a wrong number", async () => {
    mockSnapshots();
    supabase.on(
      "select",
      "talents",
      postgresError("42501", "permission denied for table talents")
    );

    await expect(getSummaryStats()).rejects.toThrow(
      "countSummaryStats.totalTalents"
    );
  });
});
