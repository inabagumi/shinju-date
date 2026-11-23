import { describe, expect, it } from "vitest";

import {
  CHART_PERIODS,
  DEFAULT_CHART_PERIOD,
  getChartPeriodLabel,
  getRequiredSnapshotDays,
  MAX_CHART_PERIOD,
  parseChartPeriod,
} from "./chart-periods";

describe("the periods of the charts", () => {
  it("offers 7 and 30 days, from 7 days", () => {
    expect(CHART_PERIODS).toStrictEqual([7, 30]);
    expect(DEFAULT_CHART_PERIOD).toBe(7);
    expect(MAX_CHART_PERIOD).toBe(Math.max(...CHART_PERIODS));
  });
});

describe(getChartPeriodLabel, () => {
  it.each([
    [7, "過去7日間"],
    [30, "過去30日間"],
  ] as const)("names %d days %s", (period, label) => {
    expect(getChartPeriodLabel(period)).toBe(label);
  });
});

describe(getRequiredSnapshotDays, () => {
  it.each([
    [7, 8],
    [30, 31],
  ])(
    "needs the snapshots of %d days and the day before: %d days",
    (period, days) => {
      expect(getRequiredSnapshotDays(period)).toBe(days);
    }
  );
});

describe(parseChartPeriod, () => {
  it.each([
    ["7", 7],
    ["30", 30],
  ] as const)("reads %s as %d days", (value, period) => {
    expect(parseChartPeriod(value)).toBe(period);
  });

  it.each([null, "", "14", "31", "30.0", " 30", "abc"])(
    "reads %o as the first period",
    (value) => {
      expect(parseChartPeriod(value)).toBe(7);
    }
  );
});
