import { REDIS_KEYS } from "@shinju-date/constants";
import { describe, expect, it } from "vitest";

import {
  createRedisDataFactory,
  createSummarySnapshots,
} from "./redis-factory.js";
import type { SortedSetItem, SummarySnapshot } from "./redis-factory.js";

const videos = [
  { id: "video-1", talent_id: "talent-1" },
  { id: "video-2", talent_id: "talent-1" },
  { id: "video-3", talent_id: "talent-2" },
];

const getSortedSet = (
  store: ReturnType<typeof createRedisDataFactory>,
  key: string
): SortedSetItem[] => {
  const value = store.get(key);

  if (!Array.isArray(value)) {
    throw new TypeError(`${key} is not a sorted set`);
  }

  return value;
};

describe(createRedisDataFactory, () => {
  it("creates the keys of each day up to today in YYYYMMDD format", () => {
    const store = createRedisDataFactory(3, {
      today: Temporal.PlainDate.from("2026-03-01"),
      videos,
    });

    for (const dateKey of ["20260301", "20260228", "20260227"]) {
      expect(
        store.has(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}${dateKey}`)
      ).toBeTruthy();
      expect(
        store.has(`${REDIS_KEYS.CLICK_CHANNEL_PREFIX}${dateKey}`)
      ).toBeTruthy();
    }

    expect(store.has(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}20260226`)).toBeFalsy();
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
    ).toStrictEqual(expected);
  });

  it("creates no click data without videos", () => {
    const store = createRedisDataFactory(1, {
      today: Temporal.PlainDate.from("2026-03-01"),
      videos: [],
    });

    expect(store.has(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}20260301`)).toBeFalsy();
    expect(store.has(`${REDIS_KEYS.CLICK_CHANNEL_PREFIX}20260301`)).toBeFalsy();
  });
});

describe(createSummarySnapshots, () => {
  const current: SummarySnapshot = {
    deletedVideos: 2,
    hiddenVideos: 3,
    scheduledVideos: 4,
    totalTalents: 5,
    totalTerms: 6,
    totalVideos: 100,
    visibleVideos: 93,
  };
  const store = createSummarySnapshots(current, {
    today: Temporal.PlainDate.from("2026-03-02"),
  });
  /** The days with the snapshots, from the oldest */
  const DATE_KEYS = [
    "20260222",
    "20260223",
    "20260224",
    "20260225",
    "20260227",
    "20260228",
    "20260301",
  ];
  const countsOf = (key: keyof SummarySnapshot): (number | undefined)[] =>
    DATE_KEYS.map(
      (dateKey) =>
        store.get(`${REDIS_KEYS.SUMMARY_STATS_PREFIX}${dateKey}`)?.[key]
    );

  it("creates the snapshots of 8 days up to yesterday, except for one", () => {
    expect([...store.keys()]).toStrictEqual(
      [
        "20260301",
        "20260228",
        "20260227",
        // 20260226 has no snapshot
        "20260225",
        "20260224",
        "20260223",
        "20260222",
      ].map((dateKey) => `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${dateKey}`)
    );
  });

  it("gives yesterday the current counts", () => {
    expect(
      store.get(`${REDIS_KEYS.SUMMARY_STATS_PREFIX}20260301`)
    ).toStrictEqual(current);
  });

  it("changes the total by an increase, a decrease and no change", () => {
    expect(countsOf("totalVideos")).toStrictEqual([
      87, 91, 89, 89, 97, 98, 100,
    ]);
  });

  it("changes the scheduled and the hidden videos, not below 0", () => {
    expect(countsOf("scheduledVideos")).toStrictEqual([7, 8, 6, 6, 5, 7, 4]);
    expect(countsOf("hiddenVideos")).toStrictEqual([4, 6, 6, 5, 6, 3, 3]);
  });

  it("keeps the total as the sum of the public, the scheduled and the hidden videos", () => {
    for (const snapshot of store.values()) {
      expect(
        snapshot.visibleVideos +
          snapshot.scheduledVideos +
          snapshot.hiddenVideos
      ).toBe(snapshot.totalVideos);
      expect(snapshot).toMatchObject({
        deletedVideos: 2,
        totalTalents: 5,
        totalTerms: 6,
      });
    }
  });
});
