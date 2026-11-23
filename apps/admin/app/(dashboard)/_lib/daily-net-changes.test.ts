import type { SummaryStats } from "@shinju-date/dashboard-stats";
import { describe, expect, it } from "vitest";

import { toDailyNetChanges } from "./daily-net-changes";
import type { HistoricalStatsEntry } from "./get-historical-stats";

const snapshot = (totalVideos: number): SummaryStats => ({
  deletedVideos: 2,
  hiddenVideos: 1,
  scheduledVideos: 5,
  totalTalents: 12,
  totalTerms: 40,
  totalVideos,
  visibleVideos: totalVideos - 6,
});

const entry = (
  day: string,
  totalVideos: number | null
): HistoricalStatsEntry => ({
  day,
  stats: totalVideos === null ? null : snapshot(totalVideos),
});

describe(toDailyNetChanges, () => {
  it("computes the net changes from the day before, after the first day", () => {
    const result = toDailyNetChanges(
      [
        entry("2025-11-09", 40_000),
        entry("2025-11-10", 40_012),
        entry("2025-11-11", 40_009),
        entry("2025-11-12", 40_009),
      ],
      "totalVideos"
    );

    expect(result).toStrictEqual([
      { day: "2025-11-10", netChange: 12 },
      { day: "2025-11-11", netChange: -3 },
      { day: "2025-11-12", netChange: 0 },
    ]);
  });

  it("leaves the days without their snapshot or the one of the day before as null", () => {
    const result = toDailyNetChanges(
      [
        entry("2025-11-08", 100),
        entry("2025-11-09", null),
        entry("2025-11-10", 105),
        entry("2025-11-11", 107),
        entry("2025-11-12", null),
      ],
      "totalVideos"
    );

    expect(result).toStrictEqual([
      { day: "2025-11-09", netChange: null },
      // Not compared with 11/08, which is not the day before
      { day: "2025-11-10", netChange: null },
      { day: "2025-11-11", netChange: 2 },
      { day: "2025-11-12", netChange: null },
    ]);
  });

  it("does not compare the entries of days that are not in a row", () => {
    // The days without a snapshot are left out of the entries
    const result = toDailyNetChanges(
      [
        entry("2025-11-08", 100),
        entry("2025-11-10", 105),
        entry("2025-11-11", 107),
      ],
      "totalVideos"
    );

    expect(result).toStrictEqual([
      { day: "2025-11-10", netChange: null },
      { day: "2025-11-11", netChange: 2 },
    ]);
  });

  it("computes across the end of a month and a year", () => {
    const result = toDailyNetChanges(
      [entry("2025-12-31", 10), entry("2026-01-01", 11)],
      "totalVideos"
    );

    expect(result).toStrictEqual([{ day: "2026-01-01", netChange: 1 }]);
  });

  it("returns nothing without the days to compare", () => {
    expect(toDailyNetChanges([], "totalVideos")).toStrictEqual([]);
    expect(
      toDailyNetChanges([entry("2025-11-12", 10)], "totalVideos")
    ).toStrictEqual([]);
  });
});
