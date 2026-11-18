import type * as Sentry from "@sentry/nextjs";
import type { Redis } from "@upstash/redis";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CronJob, RunCronJobOptions } from "./cron";
import type { ServerEnv } from "./env";

const { createAfterMock, createLoggerMock } = await vi.hoisted(
  () => import("@/test/mocks")
);

type Run = () => Promise<unknown>;
type OnError = NonNullable<RunCronJobOptions["onError"]>;

const captureCheckIn = vi.fn<typeof Sentry.captureCheckIn>(() => "check-in-id");
const captureException = vi.fn<typeof Sentry.captureException>();
const flush = vi.fn<typeof Sentry.flush>();
const serverEnv: ServerEnv = {
  CRON_SECRET: undefined,
} as Partial<ServerEnv> as ServerEnv;

vi.mock(import("@sentry/nextjs"), () => ({
  captureCheckIn,
  captureException,
  flush,
}));

const logger = createLoggerMock();
const redis = await vi.hoisted(async () => {
  const { FakeLockRedis } = await import("@/test/fake-lock-redis");

  return new FakeLockRedis();
});

vi.mock(import("@shinju-date/logger"), () => ({ logger }));

vi.mock(import("./redis"), () => ({
  redisClient: redis as Partial<Redis> as Redis,
}));

vi.mock(import("./env"), () => ({ serverEnv }));

vi.mock(import("next/server"), () => ({ after: createAfterMock() }));

const { getCronJobIdentifier, runCronJob, verifyCronRequest } =
  await import("./cron");

const LOCK_KEY = "cron:lock:videos:update";
const job: CronJob = {
  maxDurationSeconds: 120,
  path: "/videos/update",
  schedule: "1/5 * * * *",
};

const createRequest = (headers: Record<string, string> = {}): Request =>
  new Request("http://localhost:5000/videos/update", {
    headers,
    method: "POST",
  });

describe("runCronJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redis.clear();
    serverEnv.CRON_SECRET = undefined;
  });

  it("runs the job and reports it as ok", async () => {
    const run = vi.fn<Run>().mockResolvedValue(undefined);

    const response = await runCronJob(createRequest(), job, run);

    expect(response.status).toBe(204);
    expect(run).toHaveBeenCalledOnce();
    expect(captureCheckIn).toHaveBeenNthCalledWith(
      1,
      { monitorSlug: "/videos/update", status: "in_progress" },
      {
        schedule: { type: "crontab", value: "1/5 * * * *" },
        timezone: "Etc/UTC",
      }
    );
    expect(captureCheckIn).toHaveBeenLastCalledWith({
      checkInId: "check-in-id",
      monitorSlug: "/videos/update",
      status: "ok",
    });
    expect(flush).toHaveBeenCalledWith(10_000);
  });

  it("reports a failing job as an error instead of crashing", async () => {
    const error = new Error("YouTube is down");
    const run = vi.fn<Run>().mockRejectedValue(error);

    const response = await runCronJob(createRequest(), job, run);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toStrictEqual({
      error: "YouTube is down",
    });
    expect(captureException).toHaveBeenCalledWith(error);
    expect(captureCheckIn).toHaveBeenLastCalledWith({
      checkInId: "check-in-id",
      monitorSlug: "/videos/update",
      status: "error",
    });
  });

  it("responds with the result of the job as JSON", async () => {
    const run = vi.fn<Run>().mockResolvedValue({ restored: 1, softDeleted: 2 });

    const response = await runCronJob(createRequest(), job, run);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({
      restored: 1,
      softDeleted: 2,
    });
    expect(captureCheckIn).toHaveBeenLastCalledWith({
      checkInId: "check-in-id",
      monitorSlug: "/videos/update",
      status: "ok",
    });
  });

  it("lets the job clean up after it fails", async () => {
    const error = new Error("YouTube is down");
    const run = vi.fn<Run>().mockRejectedValue(error);
    const onError = vi.fn<OnError>().mockResolvedValue(undefined);

    const response = await runCronJob(createRequest(), job, run, { onError });

    expect(response.status).toBe(500);
    expect(onError).toHaveBeenCalledWith(error);
    expect(captureException).toHaveBeenCalledWith(error);
  });

  it("reports the original error when the clean-up fails too", async () => {
    const error = new Error("YouTube is down");
    const run = vi.fn<Run>().mockRejectedValue(error);
    const onError = vi
      .fn<OnError>()
      .mockRejectedValue(new Error("Redis is down"));

    const response = await runCronJob(createRequest(), job, run, { onError });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toStrictEqual({
      error: "YouTube is down",
    });
    expect(captureException).toHaveBeenCalledWith(error);
    expect(captureCheckIn).toHaveBeenLastCalledWith({
      checkInId: "check-in-id",
      monitorSlug: "/videos/update",
      status: "error",
    });
  });

  it("does not call the clean-up after a job that succeeds", async () => {
    const onError = vi.fn<OnError>();

    await runCronJob(
      createRequest(),
      job,
      vi.fn<Run>().mockResolvedValue(undefined),
      {
        onError,
      }
    );

    expect(onError).not.toHaveBeenCalled();
  });

  it("rejects a run while the previous one is still running", async () => {
    const { promise: finished, resolve: finish } =
      Promise.withResolvers<undefined>();
    const first = vi.fn<Run>(() => finished);
    const second = vi.fn<Run>().mockResolvedValue(undefined);

    const firstResponse = runCronJob(createRequest(), job, first);
    await vi.waitFor(() => expect(first).toHaveBeenCalledWith());

    const secondResponse = await runCronJob(createRequest(), job, second);

    expect(secondResponse.status).toBe(429);
    expect(second).not.toHaveBeenCalled();
    expect(captureCheckIn).toHaveBeenCalledOnce();

    finish(undefined);

    await expect(firstResponse).resolves.toHaveProperty("status", 204);
  });

  it("runs again right after the previous run ends", async () => {
    await runCronJob(
      createRequest(),
      job,
      vi.fn<Run>().mockResolvedValue(undefined)
    );
    const run = vi.fn<Run>().mockResolvedValue(undefined);

    const response = await runCronJob(createRequest(), job, run);

    expect(response.status).toBe(204);
    expect(run).toHaveBeenCalledOnce();
  });

  it("runs again right after the previous run fails", async () => {
    await runCronJob(
      createRequest(),
      job,
      vi.fn<Run>().mockRejectedValue(new Error("YouTube is down"))
    );
    const run = vi.fn<Run>().mockResolvedValue(undefined);

    const response = await runCronJob(createRequest(), job, run);

    expect(response.status).toBe(204);
    expect(run).toHaveBeenCalledOnce();
  });

  it("locks the job for a little longer than its maximum duration", async () => {
    let ttl: number | undefined;
    const run = vi.fn<Run>(async () => {
      ttl = redis.ttls.get(LOCK_KEY);
    });

    const response = await runCronJob(createRequest(), job, run);

    expect(response.status).toBe(204);
    expect(ttl).toBe(130);
    expect(redis.values.has(LOCK_KEY)).toBeFalsy();
  });

  it("locks each job separately", async () => {
    const { promise: finished, resolve: finish } =
      Promise.withResolvers<undefined>();
    const first = runCronJob(createRequest(), job, () => finished);
    const run = vi.fn<Run>().mockResolvedValue(undefined);

    const response = await runCronJob(
      createRequest(),
      { ...job, path: "/videos/update?provider=twitch" },
      run
    );

    expect(response.status).toBe(204);
    expect(run).toHaveBeenCalledOnce();

    finish(undefined);
    await first;
  });

  it("keeps the lock that another run took after its own ran out", async () => {
    const run = vi.fn<Run>(async () => {
      // The lock of this run runs out, and another run takes it.
      redis.delete(LOCK_KEY);
      await redis.set(LOCK_KEY, "another-run", { ex: 130, nx: true });
    });

    const response = await runCronJob(createRequest(), job, run);

    expect(response.status).toBe(204);
    expect(redis.values.get(LOCK_KEY)).toBe("another-run");
  });

  it("responds as usual when the lock cannot be released", async () => {
    const run = vi.fn<Run>(async () => {
      redis.evalFails = true;

      return { added: 1 };
    });

    const response = await runCronJob(createRequest(), job, run);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ added: 1 });
    expect(logger.error).toHaveBeenCalledWith("ロックを外せませんでした", {
      error: expect.any(Error),
      path: "/videos/update",
    });
  });

  describe("a job with a rate limit", () => {
    const limit = vi.fn<NonNullable<CronJob["ratelimit"]>["limit"]>();
    const rateLimitedJob = {
      ...job,
      path: "/videos/backfill",
      ratelimit: { limit },
    };

    it("runs once in a window without taking the lock", async () => {
      limit.mockResolvedValue({ success: true });
      const run = vi.fn<Run>(async () => {
        expect(redis.values.size).toBe(0);
      });

      const response = await runCronJob(createRequest(), rateLimitedJob, run);

      expect(response.status).toBe(204);
      expect(run).toHaveBeenCalledOnce();
      expect(limit).toHaveBeenCalledWith("videos:backfill");
    });

    it("rejects a run in the same window as the previous one", async () => {
      limit.mockResolvedValue({ success: false });
      const run = vi.fn<Run>();

      const response = await runCronJob(createRequest(), rateLimitedJob, run);

      expect(response.status).toBe(429);
      expect(run).not.toHaveBeenCalled();
      expect(captureCheckIn).not.toHaveBeenCalled();
    });
  });

  it("rejects requests without the cron secret", async () => {
    serverEnv.CRON_SECRET = "secret";
    const run = vi.fn<Run>();

    const response = await runCronJob(createRequest(), job, run);

    expect(response.status).toBe(401);
    expect(run).not.toHaveBeenCalled();
    expect(redis.values.size).toBe(0);
  });

  it("accepts requests with the cron secret", async () => {
    serverEnv.CRON_SECRET = "secret";
    const run = vi.fn<Run>().mockResolvedValue(undefined);

    const response = await runCronJob(
      createRequest({ Authorization: "Bearer secret" }),
      job,
      run
    );

    expect(response.status).toBe(204);
    expect(run).toHaveBeenCalledOnce();
  });
});

describe("getCronJobIdentifier", () => {
  it.each([
    ["/videos/update", "videos:update"],
    ["/videos/check?provider=twitch", "videos:check:provider=twitch"],
    [
      "/videos/check?provider=twitch&mode=all",
      "videos:check:mode=all:provider=twitch",
    ],
    [
      "/videos/check?mode=all&provider=twitch",
      "videos:check:mode=all:provider=twitch",
    ],
    ["/talents/update?provider=twitch", "talents:update:provider=twitch"],
    ["/terms/popularity/update", "terms:popularity:update"],
  ])("makes %s into %s", (path, identifier) => {
    expect(getCronJobIdentifier(path)).toBe(identifier);
  });
});

describe("verifyCronRequest", () => {
  it("should return true when Authorization header matches", () => {
    const request = new Request("https://example.com", {
      headers: {
        Authorization: "Bearer secret-token",
      },
    });

    const result = verifyCronRequest(request, { cronSecure: "secret-token" });

    expect(result).toBeTruthy();
  });

  it("should return false when Authorization header is missing", () => {
    const request = new Request("https://example.com");

    const result = verifyCronRequest(request, { cronSecure: "secret-token" });

    expect(result).toBeFalsy();
  });

  it("should return false when Authorization type is not Bearer", () => {
    const request = new Request("https://example.com", {
      headers: {
        Authorization: "Basic secret-token",
      },
    });

    const result = verifyCronRequest(request, { cronSecure: "secret-token" });

    expect(result).toBeFalsy();
  });

  it("should return false when credentials do not match", () => {
    const request = new Request("https://example.com", {
      headers: {
        Authorization: "Bearer wrong-token",
      },
    });

    const result = verifyCronRequest(request, { cronSecure: "secret-token" });

    expect(result).toBeFalsy();
  });

  it("should handle extra whitespace in Authorization header", () => {
    const request = new Request("https://example.com", {
      headers: {
        Authorization: "  Bearer   secret-token  ",
      },
    });

    const result = verifyCronRequest(request, { cronSecure: "secret-token" });

    expect(result).toBeTruthy();
  });
});
