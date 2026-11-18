import { REDIS_KEYS } from "@shinju-date/constants";
import type { Redis } from "@upstash/redis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { getRedisClient } from "@/lib/redis";

import { getClickVolume } from "./get-click-volume";

vi.mock(import("next/cache"), () => ({
  cacheLife: vi.fn<() => void>(),
}));
vi.mock(import("@/lib/redis"), async () => {
  const { createMockRedisClient } = await import("@/test/mock-redis-pipeline");
  const mockedRedisClient = createMockRedisClient({
    zrange: vi.fn<Redis["zrange"]>(),
  });

  return {
    getRedisClient: vi
      .fn<typeof getRedisClient>()
      .mockReturnValue(mockedRedisClient),
  };
});

vi.mock(import("@shinju-date/logger"), async () => {
  const { createMockLogger } = await import("@/test/logger");

  return { logger: createMockLogger() };
});

describe(getClickVolume, async () => {
  const { getRedisClient } = await import("@/lib/redis");
  const redisClient = getRedisClient();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redisClient.zrange).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should sum the clicks of each day in a single pipeline", async () => {
    vi.mocked(redisClient.zrange)
      .mockResolvedValueOnce(["video1", "3", "video2", "2"])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(["video1", "10"]);

    const result = await getClickVolume({
      range: { end: "2024-02-01", start: "2024-01-30" },
    });

    expect(result).toStrictEqual([
      { clicks: 5, date: "2024-01-30" },
      { clicks: 0, date: "2024-01-31" },
      { clicks: 10, date: "2024-02-01" },
    ]);
    expect(redisClient.pipeline).toHaveBeenCalledOnce();
    expect(vi.mocked(redisClient.zrange).mock.calls).toStrictEqual([
      [
        `${REDIS_KEYS.CLICK_VIDEO_PREFIX}20240130`,
        0,
        -1,
        { rev: false, withScores: true },
      ],
      [
        `${REDIS_KEYS.CLICK_VIDEO_PREFIX}20240131`,
        0,
        -1,
        { rev: false, withScores: true },
      ],
      [
        `${REDIS_KEYS.CLICK_VIDEO_PREFIX}20240201`,
        0,
        -1,
        { rev: false, withScores: true },
      ],
    ]);
  });

  it("should return an empty array without calling Redis for an empty range", async () => {
    const result = await getClickVolume({
      range: { end: "2024-01-31", start: "2024-02-01" },
    });

    expect(result).toStrictEqual([]);
    expect(redisClient.pipeline).not.toHaveBeenCalled();
  });

  it("should return an empty array when Redis fails", async () => {
    vi.mocked(redisClient.zrange).mockRejectedValue(new Error("Redis error"));

    const result = await getClickVolume({
      range: { end: "2024-02-01", start: "2024-01-30" },
    });

    expect(result).toStrictEqual([]);
  });
});
