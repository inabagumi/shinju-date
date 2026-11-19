import { REDIS_KEYS } from "@shinju-date/constants";
import { describe, expect, it } from "vitest";

import { FakeRedis } from "../test/fake-clients.js";
import {
  analyticsSummarySchema,
  readAnalyticsSnapshot,
  readSummarySnapshot,
  SNAPSHOT_TTL_SECONDS,
  summaryStatsSchema,
  writeAnalyticsSnapshot,
  writeSummarySnapshot,
} from "./index.js";
import type { AnalyticsSummary, SummaryStats } from "./index.js";

const dateKey = "20251113";
const summaryKey = `${REDIS_KEYS.SUMMARY_STATS_PREFIX}${dateKey}`;
const analyticsKey = `${REDIS_KEYS.SUMMARY_ANALYTICS_PREFIX}${dateKey}`;

const stats: SummaryStats = {
  deletedVideos: 1,
  hiddenVideos: 2,
  scheduledVideos: 3,
  totalTalents: 4,
  totalTerms: 5,
  totalVideos: 6,
  visibleVideos: 7,
};

const analytics: AnalyticsSummary = {
  recentClicks: 10,
  recentSearches: 20,
  totalPopularKeywords: 30,
};

describe("summaryStatsSchema.safeParse", () => {
  it("accepts summary stats", () => {
    expect(summaryStatsSchema.parse(stats)).toStrictEqual(stats);
  });

  it("rejects missing, negative and fractional counts", () => {
    const { scheduledVideos: _, ...withoutScheduled } = stats;

    expect(summaryStatsSchema.safeParse(withoutScheduled).success).toBeFalsy();
    expect(
      summaryStatsSchema.safeParse({ ...stats, totalVideos: -1 }).success
    ).toBeFalsy();
    expect(
      summaryStatsSchema.safeParse({ ...stats, totalVideos: 1.5 }).success
    ).toBeFalsy();
  });
});

describe("analyticsSummarySchema.parse", () => {
  it("accepts an analytics summary", () => {
    expect(analyticsSummarySchema.parse(analytics)).toStrictEqual(analytics);
  });

  it("rejects a count that is not a number", () => {
    expect(
      analyticsSummarySchema.safeParse({ ...analytics, recentClicks: "10" })
        .success
    ).toBeFalsy();
  });
});

describe("summary snapshots", () => {
  it("writes the snapshot with its TTL and reads it back", async () => {
    const redis = new FakeRedis();

    await writeSummarySnapshot(redis.asRedis(), dateKey, stats);

    expect(redis.values.get(summaryKey)).toStrictEqual(stats);
    expect(redis.ttls.get(summaryKey)).toBe(SNAPSHOT_TTL_SECONDS);
    await expect(
      readSummarySnapshot(redis.asRedis(), dateKey)
    ).resolves.toStrictEqual(stats);
  });

  it("reads a missing snapshot as null", async () => {
    await expect(
      readSummarySnapshot(new FakeRedis().asRedis(), dateKey)
    ).resolves.toBeNull();
  });

  it.each([
    ["a snapshot without a count", { ...stats, scheduledVideos: undefined }],
    ["a count that is not a number", { ...stats, totalVideos: "many" }],
    ["a value that is not an object", "not json"],
  ])("reads %s as null", async (_, value) => {
    const redis = new FakeRedis();
    await redis.set(summaryKey, value);

    await expect(
      readSummarySnapshot(redis.asRedis(), dateKey)
    ).resolves.toBeNull();
  });
});

describe("analytics snapshots", () => {
  it("writes the snapshot with its TTL and reads it back", async () => {
    const redis = new FakeRedis();

    await writeAnalyticsSnapshot(redis.asRedis(), dateKey, analytics);

    expect(redis.values.get(analyticsKey)).toStrictEqual(analytics);
    expect(redis.ttls.get(analyticsKey)).toBe(SNAPSHOT_TTL_SECONDS);
    await expect(
      readAnalyticsSnapshot(redis.asRedis(), dateKey)
    ).resolves.toStrictEqual(analytics);
  });

  it("reads a missing snapshot as null", async () => {
    await expect(
      readAnalyticsSnapshot(new FakeRedis().asRedis(), dateKey)
    ).resolves.toBeNull();
  });

  it("reads a snapshot that does not match the schema as null", async () => {
    const redis = new FakeRedis();
    await redis.set(analyticsKey, { recentClicks: 1 });

    await expect(
      readAnalyticsSnapshot(redis.asRedis(), dateKey)
    ).resolves.toBeNull();
  });
});
