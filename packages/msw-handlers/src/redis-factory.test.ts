import { REDIS_KEYS } from "@shinju-date/constants";
import { describe, expect, it } from "vitest";

import { createRedisDataFactory } from "./redis-factory.js";
import type { SortedSetItem } from "./redis-factory.js";

const videos = [
  { id: "video-1", talent_id: "talent-1" },
  { id: "video-2", talent_id: "talent-1" },
  { id: "video-3", talent_id: "talent-2" },
];

function getSortedSet(
  store: ReturnType<typeof createRedisDataFactory>,
  key: string
): SortedSetItem[] {
  const value = store.get(key);

  if (!Array.isArray(value)) {
    throw new TypeError(`${key} is not a sorted set`);
  }

  return value;
}

describe("createRedisDataFactory", () => {
  it("creates the keys of each day up to today in YYYYMMDD format", () => {
    const store = createRedisDataFactory(3, {
      today: Temporal.PlainDate.from("2026-03-01"),
      videos,
    });

    for (const dateKey of ["20260301", "20260228", "20260227"]) {
      expect(store.has(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}${dateKey}`)).toBe(
        true
      );
      expect(store.has(`${REDIS_KEYS.CLICK_CHANNEL_PREFIX}${dateKey}`)).toBe(
        true
      );
    }

    expect(store.has(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}20260226`)).toBe(false);
  });

  it("uses the given videos and sums up the clicks of each talent", () => {
    const store = createRedisDataFactory(1, {
      today: Temporal.PlainDate.from("2026-03-01"),
      videos,
    });
    const videoClicks = getSortedSet(
      store,
      `${REDIS_KEYS.CLICK_VIDEO_PREFIX}20260301`
    );
    const talentClicks = getSortedSet(
      store,
      `${REDIS_KEYS.CLICK_CHANNEL_PREFIX}20260301`
    );
    const expected = new Map<string, number>();

    for (const { member, score } of videoClicks) {
      const video = videos.find(({ id }) => id === member);

      expect(video).toBeDefined();

      const talentId = video?.talent_id ?? "";

      expect(score).toBeGreaterThan(0);
      expected.set(talentId, (expected.get(talentId) ?? 0) + score);
    }

    expect(
      new Map(talentClicks.map(({ member, score }) => [member, score]))
    ).toEqual(expected);
  });

  it("creates no click data without videos", () => {
    const store = createRedisDataFactory(1, {
      today: Temporal.PlainDate.from("2026-03-01"),
      videos: [],
    });

    expect(store.has(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}20260301`)).toBe(false);
    expect(store.has(`${REDIS_KEYS.CLICK_CHANNEL_PREFIX}20260301`)).toBe(false);
  });
});
