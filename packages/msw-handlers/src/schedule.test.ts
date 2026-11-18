import { TIME_ZONE } from "@shinju-date/constants";
import { describe, expect, it } from "vitest";

import { getLiveScheduleStart } from "./seeds/schedule.js";

/** `time` on Sunday, 15 November 2026 in `TIME_ZONE` */
function at(time: string) {
  return Temporal.PlainDate.from("2026-11-15").toZonedDateTime({
    plainTime: Temporal.PlainTime.from(time),
    timeZone: TIME_ZONE,
  });
}

describe("getLiveScheduleStart", () => {
  it("should start 30 minutes before now", () => {
    expect(getLiveScheduleStart(at("21:00")).equals(at("20:30"))).toBe(true);
  });

  it.each([
    "00:00",
    "00:06",
    "00:29:59",
    "00:30",
    "12:00",
    "23:00",
    "23:30",
    "23:52",
    "23:59:59.999",
  ])("should keep the hour from the start within the day at %s", (time) => {
    const now = at(time);
    const start = getLiveScheduleStart(now);

    expect(Temporal.ZonedDateTime.compare(start, now)).toBeLessThanOrEqual(0);
    expect(start.toPlainDate().equals(now.toPlainDate())).toBe(true);
    expect(
      Temporal.ZonedDateTime.compare(
        start.add({ hours: 1 }),
        now.startOfDay().add({ days: 1 })
      )
    ).toBeLessThanOrEqual(0);
  });

  it("should start at the start of the day right after midnight", () => {
    expect(getLiveScheduleStart(at("00:06")).equals(at("00:00"))).toBe(true);
  });

  it("should start at 23:00 late at night", () => {
    expect(getLiveScheduleStart(at("23:52")).equals(at("23:00"))).toBe(true);
  });
});
