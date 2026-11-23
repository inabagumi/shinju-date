import type { SummaryStats } from "@shinju-date/dashboard-stats";
import { describe, expect, it } from "vitest";

import { toDailyCounts } from "./daily-counts";
import type { HistoricalStatsEntry } from "./get-historical-stats";

const entry = (
  day: string,
  counts: Pick<SummaryStats, "hiddenVideos" | "scheduledVideos"> | null
): HistoricalStatsEntry => ({
  day,
  stats:
    counts === null
      ? null
      : {
          deletedVideos: 2,
          totalTalents: 12,
          totalTerms: 40,
          totalVideos: 40_000,
          visibleVideos: 39_950,
          ...counts,
        },
});

describe(toDailyCounts, () => {
  it("picks the count of each day, with the days without the snapshot as null", () => {
    const entries = [
      entry("2025-11-09", { hiddenVideos: 30, scheduledVideos: 12 }),
      entry("2025-11-10", null),
      entry("2025-11-11", { hiddenVideos: 0, scheduledVideos: 0 }),
      entry("2025-11-12", { hiddenVideos: 31, scheduledVideos: 12 }),
    ];

    expect(toDailyCounts(entries, "scheduledVideos")).toStrictEqual([
      { count: 12, day: "2025-11-09" },
      { count: null, day: "2025-11-10" },
      { count: 0, day: "2025-11-11" },
      { count: 12, day: "2025-11-12" },
    ]);
    expect(toDailyCounts(entries, "hiddenVideos")).toStrictEqual([
      { count: 30, day: "2025-11-09" },
      { count: null, day: "2025-11-10" },
      { count: 0, day: "2025-11-11" },
      { count: 31, day: "2025-11-12" },
    ]);
  });

  it("keeps the days across the end of a year in order", () => {
    expect(
      toDailyCounts(
        [
          entry("2025-12-31", { hiddenVideos: 1, scheduledVideos: 2 }),
          entry("2026-01-01", { hiddenVideos: 1, scheduledVideos: 3 }),
        ],
        "scheduledVideos"
      )
    ).toStrictEqual([
      { count: 2, day: "2025-12-31" },
      { count: 3, day: "2026-01-01" },
    ]);
  });

  it("returns nothing without the days", () => {
    expect(toDailyCounts([], "hiddenVideos")).toStrictEqual([]);
  });
});
