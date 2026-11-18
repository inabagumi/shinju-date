import { REDIS_KEYS, TIME_ZONE } from "@shinju-date/constants";
import type { Pipeline } from "@upstash/redis";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DAILY_TTL_SECONDS,
  dailyKey,
  hincrbyWithTtl,
  incrWithTtl,
  saddWithTtl,
  WEEKLY_TTL_SECONDS,
  weeklyKey,
  zincrbyWithTtl,
} from "./redis";

const DAY_SECONDS = 24 * 60 * 60;

const pipeline = {
  expire: vi.fn<Pipeline["expire"]>(),
  hincrby: vi.fn<Pipeline["hincrby"]>(),
  incr: vi.fn<Pipeline["incr"]>(),
  sadd: vi.fn<Pipeline["sadd"]>(),
  zincrby: vi.fn<Pipeline["zincrby"]>(),
};
const multi = pipeline as Partial<Pipeline> as Pipeline;

const at = (instant: string): Temporal.ZonedDateTime =>
  Temporal.Instant.from(instant).toZonedDateTimeISO(TIME_ZONE);

describe("lib/analytics/redis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("TTL", () => {
    it("keeps the daily keys for 90 days and the weekly keys for 35 days", () => {
      expect(DAILY_TTL_SECONDS).toBe(90 * DAY_SECONDS);
      expect(WEEKLY_TTL_SECONDS).toBe(35 * DAY_SECONDS);
    });
  });

  describe(dailyKey, () => {
    it("appends the date in Japan as YYYYMMDD", () => {
      // 2026-11-17T00:30:00+09:00
      expect(
        dailyKey(REDIS_KEYS.CLICK_VIDEO_PREFIX, at("2026-11-16T15:30:00Z"))
      ).toBe(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}20261117`);
    });

    it("pads the month and the day with zeros", () => {
      expect(
        dailyKey(REDIS_KEYS.SEARCH_VOLUME_PREFIX, at("2026-01-05T03:00:00Z"))
      ).toBe(`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20260105`);
    });
  });

  describe(weeklyKey, () => {
    it("appends the date of the Monday of the week", () => {
      // 2025-10-14 is a Tuesday
      expect(
        weeklyKey(
          REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX,
          at("2025-10-14T03:00:00Z")
        )
      ).toBe(`${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}20251013`);
    });

    it("keeps the date on a Monday", () => {
      expect(
        weeklyKey(
          REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX,
          at("2025-10-13T03:00:00Z")
        )
      ).toBe(`${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}20251013`);
    });

    it("goes back to the Monday of the previous month or year", () => {
      // 2026-01-04 is a Sunday
      expect(
        weeklyKey(
          REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX,
          at("2026-01-04T03:00:00Z")
        )
      ).toBe(`${REDIS_KEYS.SEARCH_POPULAR_WEEKLY_PREFIX}20251229`);
    });
  });

  describe(incrWithTtl, () => {
    it("queues the write and the TTL of the same key", () => {
      incrWithTtl(multi, `${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20251014`, 60);

      expect(pipeline.incr.mock.calls).toStrictEqual([
        [`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20251014`],
      ]);
      expect(pipeline.expire.mock.calls).toStrictEqual([
        [`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20251014`, 60],
      ]);
    });
  });

  describe(zincrbyWithTtl, () => {
    it("queues the write and the TTL of the same key", () => {
      zincrbyWithTtl(
        multi,
        `${REDIS_KEYS.CLICK_VIDEO_PREFIX}20251014`,
        1,
        "video-a",
        60
      );

      expect(pipeline.zincrby.mock.calls).toStrictEqual([
        [`${REDIS_KEYS.CLICK_VIDEO_PREFIX}20251014`, 1, "video-a"],
      ]);
      expect(pipeline.expire.mock.calls).toStrictEqual([
        [`${REDIS_KEYS.CLICK_VIDEO_PREFIX}20251014`, 60],
      ]);
    });
  });

  describe(saddWithTtl, () => {
    it("queues the write and the TTL of the same key", () => {
      saddWithTtl(
        multi,
        `${REDIS_KEYS.SESSIONS_TOTAL_PREFIX}20251014`,
        "session-a",
        60
      );

      expect(pipeline.sadd.mock.calls).toStrictEqual([
        [`${REDIS_KEYS.SESSIONS_TOTAL_PREFIX}20251014`, "session-a"],
      ]);
      expect(pipeline.expire.mock.calls).toStrictEqual([
        [`${REDIS_KEYS.SESSIONS_TOTAL_PREFIX}20251014`, 60],
      ]);
    });
  });

  describe(hincrbyWithTtl, () => {
    it("queues the write and the TTL of the same key", () => {
      hincrbyWithTtl(
        multi,
        `${REDIS_KEYS.SEARCH_SESSIONS_PREFIX}20251014`,
        "session-a",
        1,
        60
      );

      expect(pipeline.hincrby.mock.calls).toStrictEqual([
        [`${REDIS_KEYS.SEARCH_SESSIONS_PREFIX}20251014`, "session-a", 1],
      ]);
      expect(pipeline.expire.mock.calls).toStrictEqual([
        [`${REDIS_KEYS.SEARCH_SESSIONS_PREFIX}20251014`, 60],
      ]);
    });
  });
});
