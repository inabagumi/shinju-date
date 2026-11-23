import { describe, expect, it } from "vitest";

import type { HistoricalStatsEntry } from "./get-historical-stats";
import { toVideoSummaryChartData } from "./video-summary-charts";

const entry = (
  day: string,
  totalVideos: number | null
): HistoricalStatsEntry => ({
  day,
  stats:
    totalVideos === null
      ? null
      : {
          deletedVideos: 2,
          hiddenVideos: 30,
          scheduledVideos: 12,
          totalTalents: 12,
          totalTerms: 40,
          totalVideos,
          visibleVideos: totalVideos - 42,
        },
});

/** The snapshots of 31 days, from 2025-10-13 to 2025-11-12 */
const HISTORY = Array.from({ length: 31 }, (_, index) =>
  entry(
    Temporal.PlainDate.from("2025-10-13").add({ days: index }).toString(),
    index === 0 || index === 25 ? null : 40_000 + index
  )
);

describe(toVideoSummaryChartData, () => {
  it("charts the newest 7 days, compared with the day before them", () => {
    const data = toVideoSummaryChartData(HISTORY, 7);

    expect(data.netChanges.map(({ day }) => day)).toStrictEqual([
      "2025-11-06",
      "2025-11-07",
      "2025-11-08",
      "2025-11-09",
      "2025-11-10",
      "2025-11-11",
      "2025-11-12",
    ]);
    // 11/07 has no snapshot, and 11/08 has nothing to compare with
    expect(data.netChanges.map(({ netChange }) => netChange)).toStrictEqual([
      1,
      null,
      null,
      1,
      1,
      1,
      1,
    ]);
    expect(data.counts.scheduledVideos?.map(({ day }) => day)).toStrictEqual(
      data.netChanges.map(({ day }) => day)
    );
    expect(data.requiredSnapshotDays).toBe(8);
    expect(data.missingSnapshotDays).toBe(1);
  });

  it("charts 30 days from the 31 days of the snapshots", () => {
    const data = toVideoSummaryChartData(HISTORY, 30);

    expect(data.netChanges).toHaveLength(30);
    expect(data.netChanges[0]).toStrictEqual({
      day: "2025-10-14",
      // The base, 10/13, has no snapshot
      netChange: null,
    });
    expect(data.counts.hiddenVideos?.slice(0, 2)).toStrictEqual([
      { count: 30, day: "2025-10-14" },
      { count: 30, day: "2025-10-15" },
    ]);
    expect(data.requiredSnapshotDays).toBe(31);
    expect(data.missingSnapshotDays).toBe(2);
  });

  it("counts the days not read as missing", () => {
    const data = toVideoSummaryChartData(HISTORY.slice(-10), 30);

    expect(data.netChanges).toHaveLength(9);
    expect(data.missingSnapshotDays).toBe(22);
  });
});
