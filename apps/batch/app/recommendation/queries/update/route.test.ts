import type * as Sentry from "@sentry/nextjs";
import { CACHE_TAGS, REDIS_KEYS } from "@shinju-date/constants";
import type * as WebCache from "@shinju-date/web-cache";
import type { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as Lock from "@/lib/lock";
import type { TypedSupabaseClient } from "@/lib/supabase";

import type * as GetAllTerms from "./_lib/get-all-terms";

type Pipeline = ReturnType<Redis["multi"]>;

const { createAfterMock, createLoggerMock } = await vi.hoisted(
  () => import("@/test/mocks")
);

const acquireLock = vi.fn<typeof Lock.acquireLock>();
const releaseLock = vi.fn<typeof Lock.releaseLock>();
const revalidateTags = vi.fn<typeof WebCache.revalidateTags>();
const multi = {
  del: vi.fn<Pipeline["del"]>(),
  // `exec` is overloaded; the route calls it without arguments.
  exec: vi.fn<() => Promise<unknown[]>>(),
  expire: vi.fn<Pipeline["expire"]>(),
  zadd: vi.fn<Pipeline["zadd"]>(),
};
const redisClient = {
  del: vi.fn<Redis["del"]>(),
  exists: vi.fn<Redis["exists"]>(),
  expire: vi.fn<Redis["expire"]>(),
  multi: vi.fn<Redis["multi"]>(() => multi as Partial<Pipeline> as Pipeline),
  zrange: vi.fn<Redis["zrange"]>(),
  zunionstore: vi.fn<Redis["zunionstore"]>(),
};
const getAllTerms = vi.fn<typeof GetAllTerms.getAllTerms>();

vi.mock(import("@/lib/lock"), () => ({ acquireLock, releaseLock }));
vi.mock(import("@/lib/redis"), () => ({
  redisClient: redisClient as Partial<Redis> as Redis,
}));
vi.mock(import("@/lib/supabase"), () => ({
  supabaseClient: {} as Partial<TypedSupabaseClient> as TypedSupabaseClient,
}));
vi.mock(import("./_lib/get-all-terms"), () => ({ getAllTerms }));
vi.mock(import("@shinju-date/web-cache"), () => ({ revalidateTags }));

const captureCheckIn = vi.fn<typeof Sentry.captureCheckIn>(() => "check-in-id");
const captureException = vi.fn<typeof Sentry.captureException>();

vi.mock(import("@sentry/nextjs"), () => ({
  captureCheckIn,
  captureException,
  flush: vi.fn<typeof Sentry.flush>(),
}));

vi.mock(import("@shinju-date/logger"), () => ({
  logger: createLoggerMock(),
}));

vi.mock(import("next/server"), async (importOriginal) => ({
  ...(await importOriginal()),
  after: createAfterMock(),
}));

const { POST } = await import("./route");

const createRequest = (): NextRequest =>
  new NextRequest("http://localhost:5000/recommendation/queries/update", {
    method: "POST",
  });

describe("POST /recommendation/queries/update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acquireLock.mockResolvedValue("lock-value");
    redisClient.del.mockResolvedValue(1);
    getAllTerms.mockImplementation(async function* () {
      yield { id: "1", synonyms: ["ほげ"], term: "Hoge" };
      yield { id: "2", synonyms: [], term: "Fuga" };
    });
  });

  describe("when the popular queries match terms", () => {
    beforeEach(() => {
      redisClient.exists.mockResolvedValue(1);
      redisClient.zrange.mockResolvedValue([
        "ほげ",
        "30",
        "fuga",
        "20",
        "unknown",
        "10",
      ]);
    });

    it("saves the matching queries", async () => {
      const response = await POST(createRequest());

      expect(response.status).toBe(204);
      expect(multi.del).toHaveBeenCalledWith(
        REDIS_KEYS.QUERIES_AUTO_RECOMMENDED
      );
      expect(multi.zadd.mock.calls).toStrictEqual([
        [REDIS_KEYS.QUERIES_AUTO_RECOMMENDED, { member: "Hoge", score: 30 }],
        [REDIS_KEYS.QUERIES_AUTO_RECOMMENDED, { member: "Fuga", score: 20 }],
      ]);
      expect(multi.expire).toHaveBeenCalledWith(
        REDIS_KEYS.QUERIES_AUTO_RECOMMENDED,
        8 * 24 * 60 * 60
      );
      expect(multi.exec).toHaveBeenCalledOnce();
    });

    it("revalidates the recommendation queries", async () => {
      const response = await POST(createRequest());

      expect(response.status).toBe(204);
      expect(revalidateTags).toHaveBeenCalledExactlyOnceWith(
        [CACHE_TAGS.RECOMMENDATION_QUERIES],
        expect.anything()
      );
    });
  });

  describe("the working key of the union", () => {
    beforeEach(() => {
      redisClient.exists.mockResolvedValue(1);
      redisClient.zrange.mockResolvedValue(["ほげ", "30"]);
    });

    it("is kept for 10 minutes", async () => {
      const response = await POST(createRequest());

      expect(response.status).toBe(204);
      expect(redisClient.zunionstore).toHaveBeenCalledWith(
        REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION,
        3,
        expect.any(Array)
      );
      expect(redisClient.expire).toHaveBeenCalledWith(
        REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION,
        10 * 60
      );
      expect(redisClient.expire.mock.invocationCallOrder[0]).toBeGreaterThan(
        redisClient.zunionstore.mock.invocationCallOrder[0] ?? 0
      );
    });

    it("is deleted afterwards", async () => {
      const response = await POST(createRequest());

      expect(response.status).toBe(204);
      expect(redisClient.del).toHaveBeenCalledWith(
        REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION
      );
      expect(multi.del).not.toHaveBeenCalledWith(
        REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION
      );
    });
  });

  it("does not set an expiry on the auto recommended queries when none match", async () => {
    redisClient.exists.mockResolvedValue(1);
    redisClient.zrange.mockResolvedValue(["unknown", "10"]);

    const response = await POST(createRequest());

    expect(response.status).toBe(204);
    expect(multi.del).toHaveBeenCalledWith(REDIS_KEYS.QUERIES_AUTO_RECOMMENDED);
    expect(multi.zadd).not.toHaveBeenCalled();
    expect(multi.expire).not.toHaveBeenCalled();
  });

  it("deletes the working key of the union when reading it fails", async () => {
    const error = new Error("Redis is down");

    redisClient.exists.mockResolvedValue(1);
    redisClient.zrange.mockRejectedValueOnce(error);

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toStrictEqual({
      error: "Redis is down",
    });
    expect(redisClient.del).toHaveBeenCalledWith(
      REDIS_KEYS.SEARCH_POPULAR_TEMP_UNION
    );
    expect(multi.exec).not.toHaveBeenCalled();
    expect(revalidateTags).not.toHaveBeenCalled();
  });

  it("reports the original error when deleting the working key also fails", async () => {
    const error = new Error("Redis is down");

    redisClient.exists.mockResolvedValue(1);
    redisClient.zrange.mockRejectedValueOnce(error);
    redisClient.del.mockRejectedValueOnce(new Error("Connection lost"));

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toStrictEqual({
      error: "Redis is down",
    });
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it("clears the auto recommended queries and revalidates when there is no search data", async () => {
    redisClient.exists.mockResolvedValue(0);

    const response = await POST(createRequest());

    expect(response.status).toBe(204);
    expect(redisClient.del).toHaveBeenCalledWith(
      REDIS_KEYS.QUERIES_AUTO_RECOMMENDED
    );
    expect(redisClient.zunionstore).not.toHaveBeenCalled();
    expect(revalidateTags).toHaveBeenCalledWith(
      [CACHE_TAGS.RECOMMENDATION_QUERIES],
      expect.anything()
    );
  });

  it("reports the error and does not revalidate when the update fails", async () => {
    const error = new Error("Redis is down");

    redisClient.exists.mockResolvedValue(1);
    redisClient.zrange.mockResolvedValue(["ほげ", "30"]);
    multi.exec.mockRejectedValueOnce(error);

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toStrictEqual({
      error: "Redis is down",
    });
    expect(revalidateTags).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledWith(error);
    expect(captureCheckIn).toHaveBeenLastCalledWith({
      checkInId: "check-in-id",
      monitorSlug: "/recommendation/queries/update",
      status: "error",
    });
  });

  it("does not run while the previous run is still running", async () => {
    acquireLock.mockResolvedValue(null);

    const response = await POST(createRequest());

    expect(response.status).toBe(429);
    expect(redisClient.exists).not.toHaveBeenCalled();
    expect(revalidateTags).not.toHaveBeenCalled();
  });
});
