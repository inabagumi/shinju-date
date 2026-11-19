import type { Redis } from "@upstash/redis";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redis = await vi.hoisted(async () => {
  const { FakeLockRedis } = await import("@/test/fake-lock-redis");

  return new FakeLockRedis();
});

vi.mock(import("./redis"), () => ({
  redisClient: redis as Partial<Redis> as Redis,
}));

const { acquireLock, releaseLock } = await import("./lock");

describe("acquireLock", () => {
  beforeEach(() => {
    redis.clear();
  });

  it("takes the lock with a random value that runs out after the TTL", async () => {
    const value = await acquireLock("videos:check", 130);

    expect(value).toStrictEqual(expect.any(String));
    expect(redis.values.get("cron:lock:videos:check")).toBe(value);
    expect(redis.ttls.get("cron:lock:videos:check")).toBe(130);
  });

  it("does not take a lock that another run holds", async () => {
    const value = await acquireLock("videos:check", 130);

    await expect(acquireLock("videos:check", 130)).resolves.toBeNull();
    expect(redis.values.get("cron:lock:videos:check")).toBe(value);
  });

  it("gives each run a different value", async () => {
    const first = await acquireLock("videos:check", 130);
    redis.delete("cron:lock:videos:check");
    const second = await acquireLock("videos:check", 130);

    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
  });

  it("locks each identifier separately", async () => {
    await acquireLock("videos:check", 130);

    await expect(
      acquireLock("videos:check:provider=twitch", 130)
    ).resolves.toStrictEqual(expect.any(String));
  });
});

describe("releaseLock", () => {
  beforeEach(() => {
    redis.clear();
  });

  it("releases the lock it holds", async () => {
    const value = await acquireLock("videos:check", 130);

    await expect(
      releaseLock("videos:check", value ?? "")
    ).resolves.toBeTruthy();
    expect(redis.values.has("cron:lock:videos:check")).toBeFalsy();
    await expect(acquireLock("videos:check", 130)).resolves.not.toBeNull();
  });

  it("keeps a lock that another run took after it ran out", async () => {
    const value = await acquireLock("videos:check", 130);
    redis.delete("cron:lock:videos:check");
    const other = await acquireLock("videos:check", 130);

    await expect(releaseLock("videos:check", value ?? "")).resolves.toBeFalsy();
    expect(redis.values.get("cron:lock:videos:check")).toBe(other);
  });
});
