import { describe, expect, it } from "vitest";

import { formatChartDay, formatChartTick } from "./chart-day";

describe(formatChartTick, () => {
  it.each([
    ["2025-11-09", "11/09"],
    ["2026-01-01", "01/01"],
  ])("formats %s as %s", (day, tick) => {
    expect(formatChartTick(day)).toBe(tick);
  });
});

describe(formatChartDay, () => {
  it.each([
    ["2025-11-10", "2025/11/10（月）"],
    ["2025-11-16", "2025/11/16（日）"],
    ["2025-12-31", "2025/12/31（水）"],
    ["2026-01-01", "2026/01/01（木）"],
  ])("formats %s with the year and the day of the week", (day, label) => {
    expect(formatChartDay(day)).toBe(label);
  });
});
