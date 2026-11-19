import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./format-relative-time.js";

describe(formatRelativeTime, () => {
  // Use a fixed reference time for consistent testing
  const referenceTime = Temporal.Instant.from("2024-01-15T12:00:00Z");

  describe("past times", () => {
    it("formats times less than 1 minute ago", () => {
      // 30 seconds ago
      const time = Temporal.Instant.from("2024-01-15T11:59:30Z");
      expect(formatRelativeTime(time, "ja", referenceTime)).toBe("30 秒前");
    });

    it("formats times in minutes", () => {
      // 5 minutes ago
      const time = Temporal.Instant.from("2024-01-15T11:55:00Z");
      expect(formatRelativeTime(time, "ja", referenceTime)).toBe("5 分前");
    });

    it("formats times in hours", () => {
      // 2 hours ago
      const time = Temporal.Instant.from("2024-01-15T10:00:00Z");
      expect(formatRelativeTime(time, "ja", referenceTime)).toBe("2 時間前");
    });

    it("formats times in days", () => {
      // 2 days ago
      const time = Temporal.Instant.from("2024-01-13T12:00:00Z");
      // Intl.RelativeTimeFormat may use "一昨日" for 2 days ago
      const result = formatRelativeTime(time, "ja", referenceTime);
      expect(result).toMatch(/日前|一昨日/u);
    });

    it("formats times in weeks", () => {
      // 2 weeks ago
      const time = Temporal.Instant.from("2024-01-01T12:00:00Z");
      expect(formatRelativeTime(time, "ja", referenceTime)).toBe("2 週間前");
    });

    it("formats times in months", () => {
      // 2 months ago
      const time = Temporal.Instant.from("2023-11-15T12:00:00Z");
      expect(formatRelativeTime(time, "ja", referenceTime)).toBe("2 か月前");
    });

    it("formats times in years", () => {
      // 2 years ago
      const time = Temporal.Instant.from("2022-01-15T12:00:00Z");
      expect(formatRelativeTime(time, "ja", referenceTime)).toBe("2 年前");
    });
  });

  describe("future times", () => {
    it("formats future times in seconds", () => {
      // 30 seconds from now
      const time = Temporal.Instant.from("2024-01-15T12:00:30Z");
      expect(formatRelativeTime(time, "ja", referenceTime)).toBe("30 秒後");
    });

    it("formats future times in minutes", () => {
      // 5 minutes from now
      const time = Temporal.Instant.from("2024-01-15T12:05:00Z");
      expect(formatRelativeTime(time, "ja", referenceTime)).toBe("5 分後");
    });

    it("formats future times in hours", () => {
      // 2 hours from now
      const time = Temporal.Instant.from("2024-01-15T14:00:00Z");
      expect(formatRelativeTime(time, "ja", referenceTime)).toBe("2 時間後");
    });

    it("formats future times in days", () => {
      // 2 days from now
      const time = Temporal.Instant.from("2024-01-17T12:00:00Z");
      // Intl.RelativeTimeFormat may use "明後日" for 2 days from now
      const result = formatRelativeTime(time, "ja", referenceTime);
      expect(result).toMatch(/日後|明後日/u);
    });
  });

  describe("with ZonedDateTime", () => {
    it("accepts ZonedDateTime and formats correctly", () => {
      const time = Temporal.ZonedDateTime.from({
        day: 15,
        hour: 11,
        minute: 55,
        month: 1,
        second: 0,
        timeZone: "UTC",
        year: 2024,
      });
      expect(formatRelativeTime(time, "ja", referenceTime)).toBe("5 分前");
    });
  });

  describe("edge cases", () => {
    it("formats exactly now", () => {
      const result = formatRelativeTime(referenceTime, "ja", referenceTime);
      // Intl.RelativeTimeFormat with numeric: 'auto' returns "今" for 0 seconds
      expect(result).toBe("今");
    });

    it("handles times at boundary between units", () => {
      // Exactly 1 hour ago
      const time = Temporal.Instant.from("2024-01-15T11:00:00Z");
      expect(formatRelativeTime(time, "ja", referenceTime)).toBe("1 時間前");
    });

    it.each([
      [28, "4 週間前"],
      [29, "4 週間前"],
      [30, "4 週間前"],
      [31, "先月"],
      [360, "11 か月前"],
      [364, "11 か月前"],
      [365, "昨年"],
    ])(
      'formats %i days ago without "this month" or "this year"',
      (days, expected) => {
        const time = referenceTime.subtract({ hours: 24 * days });
        expect(formatRelativeTime(time, "ja", referenceTime)).toBe(expected);
      }
    );

    it.each([
      [28, "4 週間後"],
      [29, "4 週間後"],
      [31, "来月"],
      [360, "11 か月後"],
      [364, "11 か月後"],
      [365, "来年"],
    ])(
      "formats %i days from now with the same rules as the past",
      (days, expected) => {
        const time = referenceTime.add({ hours: 24 * days });
        expect(formatRelativeTime(time, "ja", referenceTime)).toBe(expected);
      }
    );

    it("rounds future and past times in the same way", () => {
      const past = referenceTime.subtract({ milliseconds: 90_500 });
      const future = referenceTime.add({ milliseconds: 90_500 });
      expect(formatRelativeTime(past, "ja", referenceTime)).toBe("1 分前");
      expect(formatRelativeTime(future, "ja", referenceTime)).toBe("1 分後");
    });

    it("formats less than 1 second as now in both directions", () => {
      const past = referenceTime.subtract({ milliseconds: 500 });
      const future = referenceTime.add({ milliseconds: 500 });
      expect(formatRelativeTime(past, "ja", referenceTime)).toBe("今");
      expect(formatRelativeTime(future, "ja", referenceTime)).toBe("今");
    });
  });

  describe("different locales", () => {
    it("formats in English", () => {
      // 5 minutes ago
      const time = Temporal.Instant.from("2024-01-15T11:55:00Z");
      const result = formatRelativeTime(time, "en", referenceTime);
      expect(result).toBe("5 minutes ago");
    });

    it("formats in Japanese (default)", () => {
      // 5 minutes ago
      const time = Temporal.Instant.from("2024-01-15T11:55:00Z");
      expect(formatRelativeTime(time, "ja", referenceTime)).toBe("5 分前");
    });
  });

  describe("uses current time when not specified", () => {
    it('formats without providing "now" parameter', () => {
      // This test will use the actual current time
      const pastTime = Temporal.Now.instant().subtract({ minutes: 5 });
      const result = formatRelativeTime(pastTime, "ja");
      expect(result).toMatch(/分前/u);
    });
  });
});
