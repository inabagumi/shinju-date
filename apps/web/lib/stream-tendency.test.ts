import { describe, expect, it } from "vitest";

import {
  countStreamsByWeekdayAndHour,
  getStreamCountLevel,
  summarizeStreamTendency,
} from "./stream-tendency";

function createCounts(
  cells: [weekday: number, hour: number, count: number][] = []
): number[][] {
  const counts = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0)
  );

  for (const [weekday, hour, count] of cells) {
    const row = counts[weekday];

    if (row) {
      row[hour] = count;
    }
  }

  return counts;
}

describe("countStreamsByWeekdayAndHour", () => {
  it("returns 7 rows of 24 zeros for no streams", () => {
    const counts = countStreamsByWeekdayAndHour([]);

    expect(counts).toHaveLength(7);

    for (const row of counts) {
      expect(row).toEqual(Array.from({ length: 24 }, () => 0));
    }
  });

  it("counts by the day of the week and the hour in Japan", () => {
    const counts = countStreamsByWeekdayAndHour([
      // Saturday 2026-11-14 21:00 and 21:59 in Japan
      "2026-11-14T12:00:00Z",
      "2026-11-14T12:59:59Z",
      // Monday 2026-11-09 0:00 in Japan
      "2026-11-08T15:00:00Z",
    ]);

    expect(counts[5]?.[21]).toBe(2);
    expect(counts[0]?.[0]).toBe(1);
    expect(counts.flat().reduce((sum, count) => sum + count, 0)).toBe(3);
  });

  it("counts a stream on the day in Japan, not the day before in UTC", () => {
    // Sunday 2026-11-15 1:00 in Japan, which is Saturday in UTC
    const counts = countStreamsByWeekdayAndHour(["2026-11-14T16:00:00Z"]);

    expect(counts[6]?.[1]).toBe(1);
    expect(counts[5]?.[16]).toBe(0);
  });

  it("counts a stream on New Year’s Day in Japan", () => {
    // Friday 2027-01-01 0:30 in Japan, which is Thursday 2026-12-31 in UTC
    const counts = countStreamsByWeekdayAndHour(["2026-12-31T15:30:00Z"]);

    expect(counts[4]?.[0]).toBe(1);
    expect(counts[3]?.[15]).toBe(0);
  });

  it("accepts starts with an offset", () => {
    const counts = countStreamsByWeekdayAndHour(["2026-11-14T21:00:00+09:00"]);

    expect(counts[5]?.[21]).toBe(1);
  });
});

describe("summarizeStreamTendency", () => {
  it("returns no busiest day or hour for no streams", () => {
    expect(summarizeStreamTendency(createCounts())).toEqual({
      busiestHour: null,
      busiestWeekday: null,
      max: 0,
      total: 0,
    });
  });

  it("picks the day by the total of the row and the hour by the column", () => {
    expect(
      summarizeStreamTendency(
        createCounts([
          // Friday has the busiest cell, but Saturday has more streams
          [4, 23, 4],
          [5, 20, 3],
          [5, 21, 3],
          [0, 21, 1],
        ])
      )
    ).toEqual({
      busiestHour: 21,
      busiestWeekday: 5,
      max: 4,
      total: 11,
    });
  });

  it("picks the day closer to Monday and the earlier hour on a tie", () => {
    expect(
      summarizeStreamTendency(
        createCounts([
          [6, 9, 2],
          [2, 22, 2],
          [4, 9, 1],
          [4, 22, 1],
        ])
      )
    ).toMatchObject({
      busiestHour: 9,
      busiestWeekday: 2,
      total: 6,
    });
  });

  it("matches the counts of the streams", () => {
    const counts = countStreamsByWeekdayAndHour([
      "2026-11-14T12:00:00Z",
      "2026-11-07T12:30:00Z",
      "2026-11-13T13:00:00Z",
    ]);

    expect(summarizeStreamTendency(counts)).toEqual({
      busiestHour: 21,
      busiestWeekday: 5,
      max: 2,
      total: 3,
    });
  });
});

describe("getStreamCountLevel", () => {
  it("returns 0 for no streams", () => {
    expect(getStreamCountLevel(0, 0)).toBe(0);
    expect(getStreamCountLevel(0, 8)).toBe(0);
  });

  it("splits the counts into 4 levels by the busiest cell", () => {
    expect(getStreamCountLevel(1, 8)).toBe(1);
    expect(getStreamCountLevel(2, 8)).toBe(1);
    expect(getStreamCountLevel(3, 8)).toBe(2);
    expect(getStreamCountLevel(4, 8)).toBe(2);
    expect(getStreamCountLevel(6, 8)).toBe(3);
    expect(getStreamCountLevel(7, 8)).toBe(4);
    expect(getStreamCountLevel(8, 8)).toBe(4);
  });

  it("returns the darkest level for every stream when the busiest is 1", () => {
    expect(getStreamCountLevel(1, 1)).toBe(4);
  });
});
