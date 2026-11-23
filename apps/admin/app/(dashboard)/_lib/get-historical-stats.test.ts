import { REDIS_KEYS, TIME_ZONE } from "@shinju-date/constants";
import type { SummaryStats } from "@shinju-date/dashboard-stats";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRedisClient } from "@/lib/redis";
import { createMockRedisClient } from "@/test/mock-redis-pipeline";

import { getHistoricalStats } from "./get-historical-stats";

vi.mock(import("next/cache"), () => ({
  cacheLife: vi.fn<() => void>(),
}));
vi.mock(import("@/lib/redis"), () => ({
  getRedisClient: vi.fn<typeof getRedisClient>(),
}));

const snapshot = (totalVideos: number): SummaryStats => ({
  deletedVideos: 2,
  hiddenVideos: 1,
  scheduledVideos: 5,
  totalTalents: 12,
  totalTerms: 40,
  totalVideos,
  visibleVideos: totalVideos - 6,
});

/** Keep the snapshots of the given days (`YYYYMMDD`) in Redis. */
const mockSnapshots = (snapshots: Record<string, unknown>) => {
  const get = vi.fn<(key: string) => Promise<unknown>>((key) =>
    Promise.resolve(
      snapshots[key.slice(REDIS_KEYS.SUMMARY_STATS_PREFIX.length)] ?? null
    )
  );

  vi.mocked(getRedisClient).mockReturnValue(createMockRedisClient({ get }));

  return get;
};

describe(getHistoricalStats, () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 2025-11-13 09:00 in JST
    vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(
      Temporal.Instant.from("2025-11-13T00:00:00Z").toZonedDateTimeISO(
        TIME_ZONE
      )
    );
  });

  it("reads the snapshots of the days up to yesterday, from the oldest", async () => {
    const get = mockSnapshots({
      "20251110": snapshot(28),
      "20251111": snapshot(29),
      "20251112": snapshot(31),
      // Not counted until the end of the day
      "20251113": snapshot(99),
    });

    const result = await getHistoricalStats(3);

    expect(get.mock.calls.map(([key]) => key)).toStrictEqual([
      `${REDIS_KEYS.SUMMARY_STATS_PREFIX}20251110`,
      `${REDIS_KEYS.SUMMARY_STATS_PREFIX}20251111`,
      `${REDIS_KEYS.SUMMARY_STATS_PREFIX}20251112`,
    ]);
    expect(result).toStrictEqual([
      { day: "2025-11-10", stats: snapshot(28) },
      { day: "2025-11-11", stats: snapshot(29) },
      { day: "2025-11-12", stats: snapshot(31) },
    ]);
  });

  it("keeps the days without a snapshot in the form of the counts as null", async () => {
    const { scheduledVideos: _, ...oldForm } = snapshot(20);

    mockSnapshots({
      "20251109": oldForm,
      "20251110": "broken",
      "20251112": snapshot(31),
    });

    await expect(getHistoricalStats(4)).resolves.toStrictEqual([
      { day: "2025-11-09", stats: null },
      { day: "2025-11-10", stats: null },
      { day: "2025-11-11", stats: null },
      { day: "2025-11-12", stats: snapshot(31) },
    ]);
  });

  it("reads 7 days by default", async () => {
    mockSnapshots({});

    const result = await getHistoricalStats();

    expect(result.map(({ day }) => day)).toStrictEqual([
      "2025-11-06",
      "2025-11-07",
      "2025-11-08",
      "2025-11-09",
      "2025-11-10",
      "2025-11-11",
      "2025-11-12",
    ]);
    expect(result.map(({ stats }) => stats)).toStrictEqual(
      Array.from({ length: 7 }, () => null)
    );
  });
});
