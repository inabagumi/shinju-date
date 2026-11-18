import { formatDate } from "@shinju-date/temporal-fns";
import { describe, expect, it } from "vitest";

import {
  formatLongDate,
  formatRelativeDate,
  formatShortDate,
  formatWeekday,
} from "./date-heading";

const date = (value: string) => Temporal.PlainDate.from(value);
const today = date("2026-11-14");

describe("formatWeekday", () => {
  it("should name the weekday with a letter", () => {
    expect(formatWeekday(date("2026-11-09"))).toBe("月");
    expect(formatWeekday(date("2026-11-15"))).toBe("日");
  });
});

describe("formatShortDate", () => {
  it("should write the month, the day and the weekday", () => {
    expect(formatShortDate(date("2026-11-09"))).toBe("11/09（月）");
    expect(formatShortDate(date("2026-11-15"))).toBe("11/15（日）");
  });

  it("should write the year with `year`", () => {
    expect(formatShortDate(date("2027-01-02"), { year: true })).toBe(
      "2027/01/02（土）"
    );
  });
});

describe("formatLongDate", () => {
  it("should write the month and the day", () => {
    expect(formatLongDate(date("2026-11-08"))).toBe("11月8日");
  });

  it("should write the weekday with `weekday`", () => {
    expect(formatLongDate(date("2026-11-08"), { weekday: true })).toBe(
      "11月8日（日）"
    );
  });

  it("should write the year with `year`", () => {
    expect(formatLongDate(date("2026-11-08"), { year: true })).toBe(
      "2026年11月8日"
    );
    expect(
      formatLongDate(date("2025-12-31"), { weekday: true, year: true })
    ).toBe("2025年12月31日（水）");
  });
});

describe("formatRelativeDate", () => {
  it("should name today and tomorrow", () => {
    for (const style of ["long", "short"] as const) {
      expect(formatRelativeDate(today, today, { style })).toBe("今日");
      expect(formatRelativeDate(today.add({ days: 1 }), today, { style })).toBe(
        "明日"
      );
    }
  });

  it("should name yesterday only with `yesterday`", () => {
    const yesterday = today.subtract({ days: 1 });

    expect(
      formatRelativeDate(yesterday, today, { style: "long", yesterday: true })
    ).toBe("昨日");
    expect(formatRelativeDate(yesterday, today, { style: "long" })).toBe(
      "11月13日（金）"
    );
    expect(formatRelativeDate(yesterday, today, { style: "short" })).toBe(
      "11/13（金）"
    );
  });

  it("should name yesterday across the new year", () => {
    expect(
      formatRelativeDate(date("2026-12-31"), date("2027-01-01"), {
        style: "long",
        yesterday: true,
      })
    ).toBe("昨日");
  });

  it("should write other dates in the style", () => {
    expect(
      formatRelativeDate(date("2026-11-16"), today, { style: "short" })
    ).toBe("11/16（月）");
    expect(
      formatRelativeDate(date("2026-11-12"), today, { style: "long" })
    ).toBe("11月12日（木）");
  });

  it("should write the year of the dates in another year than today", () => {
    expect(
      formatRelativeDate(date("2027-01-02"), date("2026-12-31"), {
        style: "short",
      })
    ).toBe("2027/01/02（土）");
    expect(
      formatRelativeDate(date("2025-12-31"), today, { style: "long" })
    ).toBe("2025年12月31日（水）");
  });
});

/*
 * The functions that the ones above replaced, as they were. The headings of
 * the home page, the schedule and the search results must not change by a
 * letter.
 */
const LEGACY_WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

/** `formatTimelineDate` of `app/_components/timeline.tsx` (the home page) */
function legacyFormatTimelineDate(
  value: Temporal.PlainDate,
  base: Temporal.PlainDate
): string {
  const days = base.until(value, { largestUnit: "day" }).days;

  if (days === 0) {
    return "今日";
  }

  if (days === 1) {
    return "明日";
  }

  const monthAndDay = formatDate(value, {
    includeYear: value.year !== base.year,
  });

  return `${monthAndDay}（${LEGACY_WEEKDAYS[value.dayOfWeek - 1]}）`;
}

/** `formatScheduleDay` of `lib/schedule.ts` (the schedule) */
function legacyFormatScheduleDay(value: Temporal.PlainDate): string {
  return `${formatDate(value, { includeYear: false })}（${LEGACY_WEEKDAYS[value.dayOfWeek - 1]}）`;
}

/** `formatDateHeading` of `lib/date-heading.ts` (the search results) */
function legacyFormatDateHeading(
  value: Temporal.PlainDate,
  base: Temporal.PlainDate
): string {
  const days = base.until(value, { largestUnit: "day" }).days;

  if (days === 0) {
    return "今日";
  }

  if (days === -1) {
    return "昨日";
  }

  if (days === 1) {
    return "明日";
  }

  const monthDay = `${value.month}月${value.day}日（${LEGACY_WEEKDAYS[value.dayOfWeek - 1]}）`;

  return value.year === base.year ? monthDay : `${value.year}年${monthDay}`;
}

/** `formatMonthDay` of `lib/schedule.ts` (the range of a week) */
function legacyFormatMonthDay(value: Temporal.PlainDate, withWeekday: boolean) {
  const monthDay = `${value.month}月${value.day}日`;

  return withWeekday
    ? `${monthDay}（${LEGACY_WEEKDAYS[value.dayOfWeek - 1]}）`
    : monthDay;
}

/** Every day from `start` for `days` days */
function eachDay(start: Temporal.PlainDate, days: number) {
  return Array.from({ length: days }, (_, index) => start.add({ days: index }));
}

describe("the same text as the replaced functions", () => {
  // Some days around the new year and a leap day, against every date in the
  // three years around them
  const bases = [
    date("2024-02-29"),
    date("2025-12-30"),
    date("2025-12-31"),
    date("2026-01-01"),
    date("2026-11-14"),
  ];
  const dates = eachDay(date("2024-12-01"), 3 * 366).concat(
    eachDay(date("2024-02-20"), 20)
  );

  it("formatTimelineDate", () => {
    for (const base of bases) {
      for (const value of dates) {
        expect(formatRelativeDate(value, base, { style: "short" })).toBe(
          legacyFormatTimelineDate(value, base)
        );
      }
    }
  });

  it("formatScheduleDay", () => {
    for (const value of dates) {
      expect(formatShortDate(value)).toBe(legacyFormatScheduleDay(value));
    }
  });

  it("formatDateHeading", () => {
    for (const base of bases) {
      for (const value of dates) {
        expect(
          formatRelativeDate(value, base, { style: "long", yesterday: true })
        ).toBe(legacyFormatDateHeading(value, base));
      }
    }
  });

  it("formatMonthDay", () => {
    for (const value of dates) {
      for (const weekday of [false, true]) {
        expect(formatLongDate(value, { weekday })).toBe(
          legacyFormatMonthDay(value, weekday)
        );
      }
    }
  });
});
