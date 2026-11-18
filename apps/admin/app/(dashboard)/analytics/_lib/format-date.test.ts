import { describe, expect, it } from "vitest";

import { formatDateLabel, formatDateRange } from "./format-date";

describe("formatDateLabel", () => {
  it("formats an ISO 8601 date with slashes", () => {
    expect(formatDateLabel("2026-11-09")).toBe("2026/11/09");
  });

  it("omits the year when requested", () => {
    expect(formatDateLabel("2026-11-09", { includeYear: false })).toBe("11/09");
  });
});

describe("formatDateRange", () => {
  it("formats both ends of the range", () => {
    expect(
      formatDateRange({ endDate: "2026-11-09", startDate: "2026-10-11" })
    ).toBe("2026/10/11 〜 2026/11/09");
  });
});
