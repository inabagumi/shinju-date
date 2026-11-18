// biome-ignore lint/style/noRestrictedImports: this test compares the native Temporal with the polyfill, so it needs the polyfill's implementation.
import { Temporal as PolyfillTemporal } from "temporal-polyfill/implementation";
import { describe, expect, it } from "vitest";

import {
  formatDateTime,
  formatDateTimeFromISO,
  formatDateTimeWithSeconds,
} from "./format-date-time.js";
import { formatDate } from "./format-date.js";
import { formatTime } from "./format-time.js";

// The server uses the native Temporal while some browsers use
// temporal-polyfill. Both must produce the same strings to avoid hydration
// errors, so run the same assertions against both implementations.
const implementations = [
  ["native", globalThis.Temporal],
  // The polyfill implements the same API as the native Temporal.
  ["temporal-polyfill", PolyfillTemporal as unknown as typeof Temporal],
] as const;

describe.each(implementations)("with %s Temporal", (_name, TemporalImpl) => {
  const timestamp = TemporalImpl.ZonedDateTime.from(
    "2026-03-26T01:22:03+09:00[Asia/Tokyo]"
  );

  describe("formatDate", () => {
    it("should format the date with zero-padded month and day", () => {
      expect(formatDate(timestamp)).toBe("2026/03/26");
    });

    it("should omit the year when includeYear is false", () => {
      expect(formatDate(timestamp, { includeYear: false })).toBe("03/26");
    });

    it("should format a PlainDate", () => {
      expect(formatDate(TemporalImpl.PlainDate.from("2026-01-02"))).toBe(
        "2026/01/02"
      );
    });
  });

  describe("formatTime", () => {
    it("should format the time with a zero-padded hour", () => {
      expect(formatTime(timestamp)).toBe("01:22");
    });

    it("should include seconds when includeSeconds is true", () => {
      expect(formatTime(timestamp, { includeSeconds: true })).toBe("01:22:03");
    });

    it("should format midnight as 00:00", () => {
      expect(
        formatTime(
          TemporalImpl.ZonedDateTime.from(
            "2026-03-26T00:00:00+09:00[Asia/Tokyo]"
          )
        )
      ).toBe("00:00");
    });
  });

  describe("formatDateTime", () => {
    it("should format the date and time", () => {
      expect(formatDateTime(timestamp)).toBe("2026/03/26 01:22");
    });

    it("should include seconds when includeSeconds is true", () => {
      expect(formatDateTime(timestamp, { includeSeconds: true })).toBe(
        "2026/03/26 01:22:03"
      );
      expect(formatDateTimeWithSeconds(timestamp)).toBe("2026/03/26 01:22:03");
    });
  });
});

describe("formatDateTimeFromISO", () => {
  it("should format an ISO 8601 string in the given time zone", () => {
    expect(
      formatDateTimeFromISO("2026-03-25T16:22:03Z", { timeZone: "Asia/Tokyo" })
    ).toBe("2026/03/26 01:22:03");
    expect(
      formatDateTimeFromISO("2026-03-25T16:22:03Z", { timeZone: "UTC" })
    ).toBe("2026/03/25 16:22:03");
  });

  it("should omit seconds when includeSeconds is false", () => {
    expect(
      formatDateTimeFromISO("2026-03-25T16:22:03Z", {
        includeSeconds: false,
        timeZone: "Asia/Tokyo",
      })
    ).toBe("2026/03/26 01:22");
  });
});
