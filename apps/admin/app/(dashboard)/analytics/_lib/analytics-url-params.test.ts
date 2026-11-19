import { describe, expect, it } from "vitest";

import { getDateRangeUpdates } from "./analytics-url-params";

describe(getDateRangeUpdates, () => {
  const dateRange = { endDate: "2025-11-07", startDate: "2025-11-01" };

  it("sets from and to when no day is selected", () => {
    expect(getDateRangeUpdates(null, dateRange)).toStrictEqual({
      from: "2025-11-01",
      to: "2025-11-07",
    });
  });

  it("keeps the selected day when it is within the new range", () => {
    for (const date of ["2025-11-01", "2025-11-03", "2025-11-07"]) {
      expect(getDateRangeUpdates(date, dateRange)).toStrictEqual({
        from: "2025-11-01",
        to: "2025-11-07",
      });
    }
  });

  it("removes the selected day when it is outside the new range", () => {
    for (const date of ["2025-10-31", "2025-11-08"]) {
      expect(getDateRangeUpdates(date, dateRange)).toStrictEqual({
        date: null,
        from: "2025-11-01",
        to: "2025-11-07",
      });
    }
  });

  it("removes a selected day that is not a valid date", () => {
    expect(getDateRangeUpdates("invalid", dateRange)).toStrictEqual({
      date: null,
      from: "2025-11-01",
      to: "2025-11-07",
    });
  });
});
