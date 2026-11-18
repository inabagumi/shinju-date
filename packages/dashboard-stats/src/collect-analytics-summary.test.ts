import { REDIS_KEYS } from "@shinju-date/constants";
import { describe, expect, it } from "vitest";

import { FakeRedis } from "../test/fake-clients.js";
import { collectAnalyticsSummary } from "./index.js";

const dateKey = "20251113";

describe(collectAnalyticsSummary, () => {
  it("collects the searches, clicks and popular keywords", async () => {
    const redis = new FakeRedis();
    await redis.set(`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}${dateKey}`, 150);
    redis.seedSortedSet(REDIS_KEYS.SEARCH_POPULAR_ALL_TIME, {
      a: 3,
      b: 2,
      c: 1,
    });
    redis.seedSortedSet(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}${dateKey}`, {
      video1: 10,
      video2: 20,
      video3: 15,
    });
    // Another day
    redis.seedSortedSet(`${REDIS_KEYS.CLICK_VIDEO_PREFIX}20251112`, {
      video1: 100,
    });

    await expect(
      collectAnalyticsSummary(redis.asRedis(), dateKey)
    ).resolves.toStrictEqual({
      recentClicks: 45,
      recentSearches: 150,
      totalPopularKeywords: 3,
    });
  });

  it("counts a day without records as 0", async () => {
    await expect(
      collectAnalyticsSummary(new FakeRedis().asRedis(), dateKey)
    ).resolves.toStrictEqual({
      recentClicks: 0,
      recentSearches: 0,
      totalPopularKeywords: 0,
    });
  });

  it("sums the scores read as strings and skips the others", async () => {
    const redis = new FakeRedis();
    redis.zrange = () =>
      Promise.resolve(["video1", "10", "video2", undefined, "v3", "5"]);

    const summary = await collectAnalyticsSummary(redis.asRedis(), dateKey);

    expect(summary.recentClicks).toBe(15);
  });
});
