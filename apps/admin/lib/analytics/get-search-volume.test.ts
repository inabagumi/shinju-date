import { REDIS_KEYS } from "@shinju-date/constants";
import type { Redis } from "@upstash/redis";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { getRedisClient } from "@/lib/redis";

import { getSearchVolume } from "./get-search-volume";

vi.mock(import("next/cache"), () => ({
  cacheLife: vi.fn<() => void>(),
}));
vi.mock(import("@/lib/redis"), async () => {
  const { createMockRedisClient } = await import("@/test/mock-redis-pipeline");
  const mockedRedisClient = createMockRedisClient({
    get: vi.fn<Redis["get"]>(),
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

describe(getSearchVolume, async () => {
  const { getRedisClient } = await import("@/lib/redis");
  const redisClient = getRedisClient();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redisClient.get).mockReset();
  });

  it("should get the count of each day in a single pipeline", async () => {
    vi.mocked(redisClient.get)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(3);

    const result = await getSearchVolume({
      range: { end: "2024-02-01", start: "2024-01-30" },
    });

    expect(result).toStrictEqual([
      { count: 12, date: "2024-01-30" },
      { count: 0, date: "2024-01-31" },
      { count: 3, date: "2024-02-01" },
    ]);
    expect(redisClient.pipeline).toHaveBeenCalledOnce();
    expect(vi.mocked(redisClient.get).mock.calls).toStrictEqual([
      [`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20240130`],
      [`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20240131`],
      [`${REDIS_KEYS.SEARCH_VOLUME_PREFIX}20240201`],
    ]);
  });

  it("should return an empty array without calling Redis for an empty range", async () => {
    const result = await getSearchVolume({
      range: { end: "2024-01-31", start: "2024-02-01" },
    });

    expect(result).toStrictEqual([]);
    expect(redisClient.pipeline).not.toHaveBeenCalled();
  });

  it("should return an empty array when Redis fails", async () => {
    vi.mocked(redisClient.get).mockRejectedValue(new Error("Redis error"));

    const result = await getSearchVolume({
      range: { end: "2024-02-01", start: "2024-01-30" },
    });

    expect(result).toStrictEqual([]);
  });
});
