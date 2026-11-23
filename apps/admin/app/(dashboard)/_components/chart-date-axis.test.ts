import { describe, expect, it } from "vitest";

import { getTickDays } from "./chart-date-axis";

const DAYS = Array.from({ length: 30 }, (_, index) =>
  Temporal.PlainDate.from("2025-10-14").add({ days: index }).toString()
);

describe(getTickDays, () => {
  it("shows all the days with enough space for each", () => {
    expect(getTickDays(DAYS.slice(-7), 700, 48)).toStrictEqual(DAYS.slice(-7));
    expect(getTickDays(DAYS, 1500, 48)).toStrictEqual(DAYS);
  });

  it("thins out the days from yesterday, by the shortest step that fits", () => {
    expect(getTickDays(DAYS, 750, 48)).toStrictEqual(
      DAYS.filter((_, index) => index % 2 === 1)
    );
    expect(getTickDays(DAYS, 300, 28)).toStrictEqual(
      DAYS.filter((_, index) => (29 - index) % 3 === 0)
    );
    // A week apart, on the same day of the week as yesterday
    expect(getTickDays(DAYS, 200, 28)).toStrictEqual([
      "2025-10-15",
      "2025-10-22",
      "2025-10-29",
      "2025-11-05",
      "2025-11-12",
    ]);
  });

  it("goes over the steps on a very narrow chart", () => {
    // 1px for each day, so a tick every 28 days
    expect(getTickDays(DAYS, 30, 28)).toStrictEqual([
      "2025-10-15",
      "2025-11-12",
    ]);
  });

  it("shows all the days before the chart is measured", () => {
    expect(getTickDays(DAYS, 0, 48)).toStrictEqual(DAYS);
    expect(getTickDays([], 700, 48)).toStrictEqual([]);
  });
});
