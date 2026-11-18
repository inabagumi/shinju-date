import { REDIS_KEYS } from "@shinju-date/constants";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  trackPageVisit,
  trackSearchExitWithoutClick,
  trackSearchSession,
} from "./session-analytics";

const multi = {
  exec: vi.fn(),
  expire: vi.fn(),
  hincrby: vi.fn(),
  sadd: vi.fn(),
};

vi.mock("./redis", () => ({
  getRedisClient: () => ({ multi: () => multi }),
}));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      "user-agent": "vitest",
      "x-forwarded-for": "203.0.113.1",
    }),
}));

const DAILY_TTL_SECONDS = 90 * 24 * 60 * 60;

beforeEach(() => {
  // 2025-10-14T12:00:00+09:00 (Tuesday in Asia/Tokyo)
  vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockImplementation((timeZone) =>
    Temporal.Instant.from("2025-10-14T03:00:00Z").toZonedDateTimeISO(
      timeZone ?? "UTC"
    )
  );
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("trackPageVisit", () => {
  test("adds the session to the sessions of the day, with a TTL", async () => {
    await trackPageVisit();

    expect(multi.sadd.mock.calls).toEqual([
      [`${REDIS_KEYS.SESSIONS_TOTAL_PREFIX}20251014`, expect.any(String)],
    ]);
    expect(multi.expire.mock.calls).toEqual([
      [`${REDIS_KEYS.SESSIONS_TOTAL_PREFIX}20251014`, DAILY_TTL_SECONDS],
    ]);
    expect(multi.exec).toHaveBeenCalledOnce();
  });
});

describe("trackSearchSession", () => {
  test("records the session and counts its search for the day, with a TTL on both keys", async () => {
    await trackSearchSession("歌枠");

    const sessionId = multi.sadd.mock.calls[0]?.[1];

    expect(sessionId).toEqual(expect.any(String));
    expect(multi.sadd.mock.calls).toEqual([
      [`${REDIS_KEYS.SESSIONS_WITH_SEARCH_PREFIX}20251014`, sessionId],
    ]);
    expect(multi.hincrby.mock.calls).toEqual([
      [`${REDIS_KEYS.SEARCH_SESSIONS_PREFIX}20251014`, sessionId, 1],
    ]);
    expect(multi.expire.mock.calls).toEqual([
      [`${REDIS_KEYS.SESSIONS_WITH_SEARCH_PREFIX}20251014`, DAILY_TTL_SECONDS],
      [`${REDIS_KEYS.SEARCH_SESSIONS_PREFIX}20251014`, DAILY_TTL_SECONDS],
    ]);
    expect(multi.exec).toHaveBeenCalledOnce();
  });

  test("does not write anything for a blank query", async () => {
    await trackSearchSession("  ");

    expect(multi.exec).not.toHaveBeenCalled();
  });
});

describe("trackSearchExitWithoutClick", () => {
  test("counts the exit of the normalized query for the day, with a TTL", async () => {
    await trackSearchExitWithoutClick("  Singing 歌枠 ");

    expect(multi.hincrby.mock.calls).toEqual([
      [
        `${REDIS_KEYS.SEARCH_EXIT_WITHOUT_CLICK_PREFIX}20251014`,
        "singing 歌枠",
        1,
      ],
    ]);
    expect(multi.expire.mock.calls).toEqual([
      [
        `${REDIS_KEYS.SEARCH_EXIT_WITHOUT_CLICK_PREFIX}20251014`,
        DAILY_TTL_SECONDS,
      ],
    ]);
    expect(multi.exec).toHaveBeenCalledOnce();
  });

  test("does not write anything for a blank query", async () => {
    await trackSearchExitWithoutClick("  ");

    expect(multi.exec).not.toHaveBeenCalled();
  });
});
