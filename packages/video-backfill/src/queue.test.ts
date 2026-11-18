import { REDIS_KEYS } from "@shinju-date/constants";
import { describe, expect, it, vi } from "vitest";

import {
  describeOnEachRedis,
  expectTtl,
  useScopedRedis,
} from "../test/redis.js";
import {
  BACKFILL_DEFAULT_MAX_RUN_SECONDS,
  BACKFILL_JOB_TRANSITIONS,
  BACKFILL_JOB_TTL_SECONDS,
  BACKFILL_LEASE_MARGIN_SECONDS,
  BACKFILL_MAX_ATTEMPTS,
  BackfillQueue,
  BackfillTransitionError,
  canTransition,
  getBackfillJobId,
  getJobActivity,
} from "./index.js";
import type {
  BackfillClaim,
  BackfillJob,
  BackfillRequest,
  BackfillWriteResult,
} from "./index.js";
import { createRequestedJob } from "./jobs.js";

const now = Temporal.Instant.from("2026-11-14T00:00:00Z");
const later = (minutes: number) => now.add({ minutes });

const request: BackfillRequest = {
  accountId: "channel-row-1",
  provider: "youtube",
  requestedBy: "user-1",
  talentId: "talent-1",
};
const jobId = getBackfillJobId("youtube", "channel-row-1");
const lockKey = `${REDIS_KEYS.VIDEO_BACKFILL_LOCK_PREFIX}${jobId}`;

/** Claims the next job, failing the test when there is none. */
const claimJob = async (queue: BackfillQueue, at: Temporal.Instant) => {
  const claim = await queue.claim(at);

  if (!claim) {
    throw new Error("Expected a job to claim");
  }

  return claim;
};

/**
 * The claim to keep writing with after a write, failing the test when the
 * lock was lost.
 */
const nextClaim = (
  { token }: BackfillClaim,
  result: BackfillWriteResult
): BackfillClaim => {
  if (result.status !== "saved") {
    throw new Error("Expected the write to be saved");
  }

  return { job: result.job, token };
};

/** A page that is not the last one. */
const page = (added: number, nextCursor: string) => ({
  added,
  done: false,
  nextCursor,
});

/** The last page of a history. */
const lastPage = (added = 0) => ({ added, done: true, nextCursor: null });

/** The claim with changes made to its job. */
const withChanges = (
  { job, token }: BackfillClaim,
  changes: Partial<BackfillJob>
): BackfillClaim => ({ job: { ...job, ...changes }, token });

/** A job in `status`, last updated `minutesAgo` minutes before `now`. */
const jobAt = (status: BackfillJob["status"], minutesAgo = 1) => ({
  status,
  updatedAt: later(-minutesAgo).toString(),
});

describeOnEachRedis((createClient) => {
  describe(BackfillQueue, () => {
    const getScopedRedis = useScopedRedis(createClient);

    const createQueue = (
      options?: ConstructorParameters<typeof BackfillQueue>[1]
    ) => {
      const scoped = getScopedRedis();

      return {
        queue: new BackfillQueue(scoped.redis, options),
        redis: scoped.redis,
        scoped,
      };
    };

    /**
     * Claims the job with a worker whose lease then runs out, after which
     * the job is requested again and another worker claims it.
     */
    const claimTwice = async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);
      const stale = await claimJob(queue, later(1));
      await redis.del(lockKey);
      await queue.enqueue(request, later(10));
      const current = await claimJob(queue, later(11));

      return { current, queue, redis, stale };
    };

    it("queues a job and keeps it for a week", async () => {
      const { queue, redis } = createQueue();

      await expect(queue.enqueue(request, now)).resolves.toStrictEqual({
        enqueued: true,
        job: expect.objectContaining({
          added: 0,
          cursor: null,
          id: jobId,
          requestedAt: now.toString(),
          requestedBy: "user-1",
          status: "pending",
          talentId: "talent-1",
        }),
      });

      await expect(
        redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1)
      ).resolves.toStrictEqual([jobId]);
      await expectTtl(
        redis,
        `${REDIS_KEYS.VIDEO_BACKFILL_JOB_PREFIX}${jobId}`,
        BACKFILL_JOB_TTL_SECONDS
      );
      await expectTtl(
        redis,
        REDIS_KEYS.VIDEO_BACKFILL_QUEUE,
        BACKFILL_JOB_TTL_SECONDS
      );
    });

    it("refuses a second request while the job is queued", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);

      await expect(queue.enqueue(request, later(1))).resolves.toMatchObject({
        enqueued: false,
        job: { status: "pending" },
      });
      await expect(
        redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1)
      ).resolves.toHaveLength(1);
    });

    it("handles requests for the same account at the same moment once", async () => {
      const { queue, redis } = createQueue();

      const results = await Promise.all([
        queue.enqueue(request, now),
        queue.enqueue({ ...request, requestedBy: "user-2" }, now),
      ]);

      expect(results.filter((result) => result.enqueued)).toHaveLength(1);
      await expect(
        redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1)
      ).resolves.toStrictEqual([jobId]);
    });

    it("does not save over progress made after the request read the job", async () => {
      const { queue, redis, scoped } = createQueue();

      // The request stalls after reading; meanwhile another request queues the
      // job and a worker reads a page of it.
      scoped.beforeNextScript(async () => {
        await queue.enqueue({ ...request, requestedBy: "user-2" }, now);
        const claim = await claimJob(queue, later(1));
        const recorded = await queue.recordPage(
          claim,
          page(4, "page-2"),
          later(2)
        );
        await queue.requeue(nextClaim(claim, recorded), later(2));
      });

      await expect(queue.enqueue(request, later(3))).resolves.toMatchObject({
        enqueued: false,
        job: { added: 4, cursor: "page-2", requestedBy: "user-2" },
      });
      await expect(
        redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1)
      ).resolves.toStrictEqual([jobId]);
    });

    it("does not queue a job that a worker claimed after it was read", async () => {
      const { queue, redis, scoped } = createQueue();

      await queue.enqueue(request, now);
      const claim = await claimJob(queue, later(1));
      await queue.recordFailure(
        claim,
        new Error("quota exceeded"),
        { permanent: true },
        later(2)
      );

      // A stale queue entry is claimed between the request's read and write.
      scoped.beforeNextScript(async () => {
        await redis.set(lockKey, "worker");
      });

      await expect(queue.enqueue(request, later(3))).resolves.toMatchObject({
        enqueued: false,
        job: { status: "failed" },
      });
      await expect(
        redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1)
      ).resolves.toStrictEqual([]);
    });

    it("saves nothing when the job cannot be added to the queue", async () => {
      const { queue, redis } = createQueue();

      // LPUSH fails on a key of another type.
      await redis.set(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, "not a list");

      await expect(queue.enqueue(request, now)).rejects.toThrow("WRONGTYPE");
      await expect(queue.getJobs([jobId], now)).resolves.toStrictEqual([null]);

      // Once the queue works again, the request can be made right away.
      await redis.del(REDIS_KEYS.VIDEO_BACKFILL_QUEUE);

      await expect(queue.enqueue(request, now)).resolves.toMatchObject({
        enqueued: true,
      });
    });

    it("keeps a job claimed when it cannot be put back in the queue", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);
      const claim = await claimJob(queue, later(1));

      await redis.set(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, "not a list");

      await expect(
        queue.requeue(withChanges(claim, { cursor: "page-2" }))
      ).rejects.toThrow("WRONGTYPE");
      // Not left pending without a queue entry: still running and locked, and
      // free to be requested again once the lease runs out.
      await expect(queue.getJobs([jobId], later(2))).resolves.toStrictEqual([
        {
          active: true,
          job: expect.objectContaining({ cursor: null, status: "running" }),
          status: "running",
        },
      ]);
    });

    it("refuses a second request while the job is being read", async () => {
      const { queue } = createQueue();

      await queue.enqueue(request, now);
      await queue.claim(later(1));

      await expect(queue.enqueue(request, later(2))).resolves.toMatchObject({
        enqueued: false,
        job: { status: "running" },
      });
    });

    it("claims jobs in the order they were queued and locks them", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);
      await queue.enqueue({ ...request, accountId: "channel-row-2" }, now);

      await expect(queue.claim(later(1))).resolves.toStrictEqual({
        job: expect.objectContaining({
          id: jobId,
          startedAt: later(1).toString(),
          status: "running",
          updatedAt: later(1).toString(),
        }),
        token: expect.any(String),
      });
      await expectTtl(redis, lockKey, queue.leaseSeconds);
      await expect(queue.claim(later(1))).resolves.toMatchObject({
        job: { id: "youtube:channel-row-2" },
      });
      await expect(queue.claim(later(1))).resolves.toBeNull();
    });

    it("does not hand out a job that is locked by another worker", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);
      // Queued a second time, e.g. by two requests at the same moment.
      await redis.lpush(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, jobId);

      await expect(queue.claim(later(1))).resolves.toMatchObject({
        job: { id: jobId },
      });
      await expect(queue.claim(later(1))).resolves.toBeNull();
    });

    it("skips queue entries of jobs that are finished or gone", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);
      await queue.recordPage(
        await claimJob(queue, later(1)),
        lastPage(),
        later(2)
      );
      await redis.lpush(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, jobId, "youtube:gone");

      await expect(queue.claim(later(3))).resolves.toBeNull();
      await expect(redis.exists(lockKey)).resolves.toBe(0);
    });

    it("puts a job back at the end of the queue to continue later", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);
      await queue.enqueue({ ...request, accountId: "channel-row-2" }, now);
      const claim = await claimJob(queue, later(1));
      const recorded = await queue.recordPage(
        claim,
        page(3, "page-2"),
        later(2)
      );

      await expect(
        queue.requeue(nextClaim(claim, recorded), later(2))
      ).resolves.toMatchObject({ status: "saved" });

      await expect(redis.exists(lockKey)).resolves.toBe(0);
      await expect(
        redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1)
      ).resolves.toStrictEqual([jobId, "youtube:channel-row-2"]);
      await expect(queue.getJobs([jobId], later(2))).resolves.toStrictEqual([
        {
          active: true,
          job: expect.objectContaining({
            added: 3,
            cursor: "page-2",
            pages: 1,
            status: "pending",
          }),
          status: "pending",
        },
      ]);
    });

    it("records a page of a job and keeps it claimed", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);
      const claim = await claimJob(queue, later(1));

      await expect(
        queue.recordPage(claim, page(2, "page-2"), later(2))
      ).resolves.toStrictEqual({
        job: {
          ...claim.job,
          added: 2,
          cursor: "page-2",
          pages: 1,
          updatedAt: later(2).toString(),
          version: 3,
        },
        status: "saved",
      });
      await expect(queue.getJobs([jobId], later(2))).resolves.toStrictEqual([
        {
          active: true,
          job: expect.objectContaining({ added: 2, status: "running" }),
          status: "running",
        },
      ]);
      await expect(redis.get(lockKey)).resolves.toBe(claim.token);
    });

    it("completes a job with its last page and releases it", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);
      const claim = await claimJob(queue, later(1));
      const first = nextClaim(
        claim,
        await queue.recordPage(claim, page(2, "page-2"), later(2))
      );
      const done = await queue.recordPage(first, lastPage(1), later(3));

      expect(done).toStrictEqual({
        job: expect.objectContaining({
          added: 3,
          cursor: null,
          error: null,
          finishedAt: later(3).toString(),
          pages: 2,
          status: "done",
        }),
        status: "saved",
      });
      await expect(redis.exists(lockKey)).resolves.toBe(0);
      await expect(
        queue.getJobs([jobId, "twitch:none"])
      ).resolves.toStrictEqual([
        {
          active: false,
          job: done.status === "saved" && done.job,
          status: "done",
        },
        null,
      ]);
    });

    it("retries a job that fails until the attempts run out", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);

      /** Fails the job once, after which it is put back in the queue. */
      const failAttempt = async (attempt: number) => {
        const claim = await claimJob(queue, later(attempt));

        await expect(
          queue.recordFailure(
            claim,
            new Error("quota exceeded"),
            {},
            later(attempt)
          )
        ).resolves.toMatchObject({
          job: {
            attempts: attempt,
            error: "quota exceeded",
            status: "pending",
          },
          status: "saved",
        });
        await expect(
          redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1)
        ).resolves.toStrictEqual([jobId]);
      };

      for (let attempt = 1; attempt < BACKFILL_MAX_ATTEMPTS; attempt += 1) {
        // oxlint-disable-next-line eslint/no-await-in-loop -- each attempt claims the job that the previous one put back in the queue
        await failAttempt(attempt);
      }

      const last = await claimJob(queue, later(BACKFILL_MAX_ATTEMPTS));

      await expect(
        queue.recordFailure(last, "quota exceeded", {}, later(10))
      ).resolves.toMatchObject({
        job: {
          attempts: BACKFILL_MAX_ATTEMPTS,
          error: "quota exceeded",
          finishedAt: later(10).toString(),
          status: "failed",
        },
        status: "saved",
      });
      await expect(redis.exists(lockKey)).resolves.toBe(0);
      await expect(
        redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1)
      ).resolves.toStrictEqual([]);
    });

    it("gives a job up after the attempts the queue was made with", async () => {
      const { queue } = createQueue({ maxAttempts: 1 });

      await queue.enqueue(request, now);

      await expect(
        queue.recordFailure(await claimJob(queue, later(1)), "error")
      ).resolves.toMatchObject({ job: { attempts: 1, status: "failed" } });
    });

    it("gives a job up at once when the error is permanent", async () => {
      const { queue } = createQueue();

      await queue.enqueue(request, now);

      await expect(
        queue.recordFailure(await claimJob(queue, later(1)), "gone", {
          permanent: true,
        })
      ).resolves.toMatchObject({
        job: { attempts: 1, error: "gone", status: "failed" },
      });
    });

    it("counts the failures in a row only", async () => {
      const { queue } = createQueue();

      await queue.enqueue(request, now);
      await queue.recordFailure(await claimJob(queue, later(1)), "error");
      const claim = await claimJob(queue, later(2));

      expect(claim.job).toMatchObject({ attempts: 1, error: "error" });
      await expect(
        queue.recordPage(claim, page(1, "page-2"), later(3))
      ).resolves.toMatchObject({ job: { attempts: 0, error: null } });
    });

    it("puts a job back with its progress when the page cannot be saved", async () => {
      const { queue, redis, scoped } = createQueue();

      await queue.enqueue(request, now);
      const claim = await claimJob(queue, later(1));

      scoped.beforeNextScript(() =>
        Promise.reject(new Error("redis unavailable"))
      );

      await expect(
        queue.recordPage(claim, page(3, "page-2"), later(2))
      ).rejects.toThrow("redis unavailable");
      await expect(redis.exists(lockKey)).resolves.toBe(0);
      await expect(
        redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1)
      ).resolves.toStrictEqual([jobId]);
      await expect(queue.getJobs([jobId], later(2))).resolves.toStrictEqual([
        expect.objectContaining({
          job: expect.objectContaining({
            added: 3,
            cursor: "page-2",
            pages: 1,
            status: "pending",
          }),
        }),
      ]);
    });

    it("keeps the error of the save when the job cannot be put back either", async () => {
      const { queue, redis, scoped } = createQueue();

      await queue.enqueue(request, now);
      const claim = await claimJob(queue, later(1));

      await redis.set(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, "not a list");
      scoped.beforeNextScript(() =>
        Promise.reject(new Error("redis unavailable"))
      );

      await expect(
        queue.recordPage(claim, page(3, "page-2"), later(2))
      ).rejects.toThrow("redis unavailable");
      await expect(redis.get(lockKey)).resolves.toBe(claim.token);
    });

    it("refuses to move a job in a way the transitions do not allow", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);
      const claim = await claimJob(queue, later(1));
      const done = nextClaim(
        claim,
        await queue.recordPage(claim, lastPage(), later(2))
      );
      // The job as saved, and a stale lock that would let a write through.
      const saved = await redis.get(
        `${REDIS_KEYS.VIDEO_BACKFILL_JOB_PREFIX}${jobId}`
      );

      await redis.set(lockKey, claim.token);

      await expect(
        queue.recordPage(done, page(1, "page-2"), later(3))
      ).rejects.toThrow(BackfillTransitionError);
      await expect(
        queue.recordPage(done, lastPage(), later(3))
      ).rejects.toThrow(BackfillTransitionError);
      await expect(
        queue.recordFailure(done, "error", {}, later(3))
      ).rejects.toThrow(BackfillTransitionError);
      await expect(queue.requeue(done, later(3))).rejects.toThrow(
        BackfillTransitionError
      );

      await expect(
        Promise.all([
          redis.get(`${REDIS_KEYS.VIDEO_BACKFILL_JOB_PREFIX}${jobId}`),
          redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1),
        ])
      ).resolves.toStrictEqual([saved, []]);
    });

    it("refuses to finish a job that was not claimed", async () => {
      const { queue } = createQueue();

      await queue.enqueue(request, now);
      const claim = await claimJob(queue, later(1));
      await queue.recordPage(claim, lastPage(), later(2));

      await expect(
        queue.recordPage(withChanges(claim, { status: "pending" }), lastPage())
      ).rejects.toThrow("that is pending cannot move to done");
    });

    it("locks a claim for as long as a worker may run, and a little more", async () => {
      const { queue, redis } = createQueue({ maxRunSeconds: 120 });

      expect(queue.leaseSeconds).toBe(120 + BACKFILL_LEASE_MARGIN_SECONDS);

      await queue.enqueue(request, now);
      await claimJob(queue, later(1));

      await expectTtl(redis, lockKey, 120 + BACKFILL_LEASE_MARGIN_SECONDS);
    });

    it("resumes a failed job where it stopped", async () => {
      const { queue } = createQueue();

      await queue.enqueue(request, now);
      const claim = await claimJob(queue, later(1));
      await queue.recordFailure(
        nextClaim(claim, await queue.recordPage(claim, page(5, "page-3"))),
        "error",
        { permanent: true }
      );

      await expect(
        queue.enqueue({ ...request, requestedBy: "user-2" }, later(5))
      ).resolves.toMatchObject({
        enqueued: true,
        job: {
          added: 5,
          cursor: "page-3",
          error: null,
          requestedBy: "user-2",
          status: "pending",
        },
      });
    });

    it("starts a job that is done over from the newest videos", async () => {
      const { queue } = createQueue();

      await queue.enqueue(request, now);
      const claim = await claimJob(queue, later(1));
      await queue.recordPage(
        nextClaim(claim, await queue.recordPage(claim, page(4, "page-2"))),
        lastPage(1)
      );

      await expect(queue.enqueue(request, later(5))).resolves.toMatchObject({
        enqueued: true,
        job: { added: 0, cursor: null, pages: 0, status: "pending" },
      });
    });

    it("lets a job whose worker died be requested again", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);
      await queue.claim(later(1));
      // The lease ran out.
      await redis.del(lockKey);

      await expect(queue.getJobs([jobId], later(10))).resolves.toStrictEqual([
        {
          active: false,
          job: expect.objectContaining({ status: "running" }),
          status: "interrupted",
        },
      ]);
      await expect(queue.enqueue(request, later(10))).resolves.toMatchObject({
        enqueued: true,
      });
    });

    it("claims a job in one call to Redis", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);

      const methods = redis as unknown as Record<string, () => unknown>;
      const calls = Object.keys(methods)
        .filter((name) => typeof methods[name] === "function")
        .map((name) => vi.spyOn(methods, name));

      await claimJob(queue, later(1));

      expect(calls.reduce((sum, spy) => sum + spy.mock.calls.length, 0)).toBe(
        1
      );
    });

    it("locks each claim with a token of its own", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);
      const first = await claimJob(queue, later(1));
      await queue.requeue(first, later(2));
      const second = await claimJob(queue, later(3));

      expect(second.token).not.toBe(first.token);
      await expect(redis.get(lockKey)).resolves.toBe(second.token);
    });

    describe("when the lease of a worker ran out", () => {
      it.each<{
        name: string;
        write: (
          queue: BackfillQueue,
          stale: Awaited<ReturnType<typeof claimJob>>
        ) => Promise<unknown>;
      }>([
        {
          name: "a page with a next page",
          write: (queue, stale) =>
            queue.recordPage(stale, page(9, "stale-page"), later(12)),
        },
        {
          name: "the last page",
          write: (queue, stale) =>
            queue.recordPage(stale, lastPage(9), later(12)),
        },
        {
          name: "a failure",
          write: (queue, stale) =>
            queue.recordFailure(stale, "error", {}, later(12)),
        },
        {
          name: "a permanent failure",
          write: (queue, stale) =>
            queue.recordFailure(stale, "error", { permanent: true }, later(12)),
        },
        {
          name: "a request to put the job back",
          write: (queue, stale) => queue.requeue(stale, later(12)),
        },
      ])("ignores $name from that worker", async ({ write }) => {
        const { current, queue, redis, stale } = await claimTwice();

        await expect(write(queue, stale)).resolves.toStrictEqual({
          status: "lost",
        });
        await expect(
          Promise.all([
            queue.getJobs([jobId], later(12)),
            redis.get(lockKey),
            redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1),
          ])
        ).resolves.toStrictEqual([
          [{ active: true, job: current.job, status: "running" }],
          current.token,
          [],
        ]);
      });

      it("still saves the writes of the worker that holds the job", async () => {
        const { current, queue } = await claimTwice();

        await expect(
          queue.recordPage(current, lastPage(), later(13))
        ).resolves.toMatchObject({
          job: { status: "done" },
          status: "saved",
        });
      });
    });

    it("ignores the writes of a worker whose lease ran out even if no one claimed the job", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);
      const claim = await claimJob(queue, later(1));
      await redis.del(lockKey);

      await expect(
        queue.recordPage(claim, page(1, "page-2"), later(10))
      ).resolves.toStrictEqual({ status: "lost" });
      await expect(queue.getJobs([jobId], later(10))).resolves.toStrictEqual([
        { active: false, job: claim.job, status: "interrupted" },
      ]);
    });

    it("lets a claimed job whose texts need escaping be requested again", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);
      // Saved by the script that claims the job, which encodes it again.
      await queue.requeue(
        withChanges(await claimJob(queue, later(1)), {
          cursor: "a/b+c==",
          error: 'GET https://www.youtube.com/ failed: "見つかりません" \\/',
        }),
        later(2)
      );
      const claim = await claimJob(queue, later(3));
      await redis.del(lockKey);

      await expect(queue.enqueue(request, later(10))).resolves.toMatchObject({
        enqueued: true,
        job: { cursor: "a/b+c==", status: "pending" },
      });
      expect(claim.job).toMatchObject({
        cursor: "a/b+c==",
        error: 'GET https://www.youtube.com/ failed: "見つかりません" \\/',
      });
    });

    it("lets a job that waited too long in the queue be requested again", async () => {
      const { queue } = createQueue();

      await queue.enqueue(request, now);

      await expect(queue.getJobs([jobId], later(59))).resolves.toStrictEqual([
        expect.objectContaining({ active: true }),
      ]);
      await expect(queue.getJobs([jobId], later(61))).resolves.toStrictEqual([
        expect.objectContaining({ active: false }),
      ]);
    });

    it("keeps the check a resumed job belongs to unless a new one is given", async () => {
      const { queue } = createQueue();

      await queue.enqueue({ ...request, runId: "run-1" }, now);
      const claim = await claimJob(queue, later(1));
      await queue.recordFailure(
        nextClaim(claim, await queue.recordPage(claim, page(0, "page-3"))),
        "error",
        { permanent: true }
      );

      await expect(queue.enqueue(request, later(5))).resolves.toMatchObject({
        job: { cursor: "page-3", runId: "run-1" },
      });

      const resumed = await claimJob(queue, later(6));
      await queue.recordFailure(resumed, "error", { permanent: true });

      await expect(
        queue.enqueue({ ...request, runId: "run-2" }, later(10))
      ).resolves.toMatchObject({ job: { runId: "run-2" } });
    });

    it("does not carry the check over when a job that is done starts over", async () => {
      const { queue } = createQueue();

      await queue.enqueue({ ...request, runId: "run-1" }, now);
      await queue.recordPage(await claimJob(queue, later(1)), lastPage());

      await expect(queue.enqueue(request, later(5))).resolves.toMatchObject({
        job: { runId: null },
      });
    });

    it("saves a job that a worker completed or gave up to the keys it is given", async () => {
      const { queue, redis } = createQueue({
        finishedJobKeys: (job) => [`copy:${job.status}`],
      });

      await queue.enqueue(request, now);
      const completed = await queue.recordPage(
        await claimJob(queue, later(1)),
        lastPage(3),
        later(2)
      );
      await queue.enqueue(request, later(3));
      const failed = await queue.recordFailure(
        await claimJob(queue, later(4)),
        new Error("account not found"),
        { permanent: true },
        later(5)
      );

      await expect(redis.get("copy:done")).resolves.toStrictEqual(
        completed.status === "saved" && completed.job
      );
      await expect(redis.get("copy:failed")).resolves.toStrictEqual(
        failed.status === "saved" && failed.job
      );
      await expectTtl(redis, "copy:done", BACKFILL_JOB_TTL_SECONDS);
      await expectTtl(redis, "copy:failed", BACKFILL_JOB_TTL_SECONDS);
    });

    it("saves a finished job to the keys it is given in one call to Redis", async () => {
      const { queue, redis } = createQueue({
        finishedJobKeys: () => ["copy-1", "copy-2"],
      });

      await queue.enqueue(request, now);
      const claim = await claimJob(queue, later(1));

      const methods = redis as unknown as Record<string, () => unknown>;
      const calls = Object.keys(methods)
        .filter((name) => typeof methods[name] === "function")
        .map((name) => vi.spyOn(methods, name));

      const done = await queue.recordPage(claim, lastPage(), later(2));

      expect(calls.reduce((sum, spy) => sum + spy.mock.calls.length, 0)).toBe(
        1
      );
      vi.restoreAllMocks();
      await expect(redis.mget("copy-1", "copy-2")).resolves.toStrictEqual([
        done.status === "saved" && done.job,
        done.status === "saved" && done.job,
      ]);
    });

    it("does not save a job that a worker keeps, puts back or lost to them", async () => {
      const { queue, redis } = createQueue({ finishedJobKeys: () => ["copy"] });

      await queue.enqueue(request, now);
      const claim = await claimJob(queue, later(1));
      const recorded = await queue.recordPage(claim, page(1, "page-2"));
      await queue.recordFailure(nextClaim(claim, recorded), "error");
      const stale = await claimJob(queue, later(2));
      await redis.del(lockKey);
      await queue.recordPage(stale, lastPage());

      await expect(redis.get("copy")).resolves.toBeNull();
    });

    it("increments the version of a job with every write", async () => {
      const { queue, redis } = createQueue();
      const stored = async () => {
        const job = await redis.get<BackfillJob>(
          `${REDIS_KEYS.VIDEO_BACKFILL_JOB_PREFIX}${jobId}`
        );

        return job?.version;
      };

      await queue.enqueue(request, now);
      const enqueued = await stored();

      const claim = await claimJob(queue, later(1));
      expect({
        claimed: claim.job.version,
        enqueued,
        stored: await stored(),
      }).toStrictEqual({ claimed: 2, enqueued: 1, stored: 2 });

      const recorded = await queue.recordPage(claim, page(1, "page-2"));
      expect({ recorded, stored: await stored() }).toMatchObject({
        recorded: { job: { version: 3 } },
        stored: 3,
      });

      await queue.requeue(nextClaim(claim, recorded));
      await expect(stored()).resolves.toBe(4);

      const done = await queue.recordPage(
        await claimJob(queue, later(2)),
        lastPage()
      );
      expect({ done, stored: await stored() }).toMatchObject({
        done: { job: { version: 6 } },
        stored: 6,
      });

      await expect(queue.enqueue(request, later(3))).resolves.toMatchObject({
        job: { version: 7 },
      });
    });

    it("lets a job saved without a version be requested again", async () => {
      const { queue, redis } = createQueue();
      const { version: _, ...saved }: BackfillJob = {
        ...createRequestedJob(request, null, now),
        cursor: "page-3",
        error: "quota exceeded",
        status: "failed",
      };

      await redis.set(`${REDIS_KEYS.VIDEO_BACKFILL_JOB_PREFIX}${jobId}`, saved);

      await expect(queue.enqueue(request, later(1))).resolves.toMatchObject({
        enqueued: true,
        job: { cursor: "page-3", status: "pending", version: 1 },
      });
    });

    it("compares the version of a job, not how it is written", async () => {
      const { queue, redis } = createQueue();
      const job: BackfillJob = {
        ...createRequestedJob(request, null, now),
        status: "done",
        version: 4,
      };
      // The same job with its fields in another order.
      const reordered = Object.fromEntries(Object.entries(job).toReversed());

      await redis.set(
        `${REDIS_KEYS.VIDEO_BACKFILL_JOB_PREFIX}${jobId}`,
        JSON.stringify(reordered)
      );

      await expect(queue.enqueue(request, later(1))).resolves.toMatchObject({
        enqueued: true,
        job: { version: 5 },
      });
    });

    it("requeues a job once when two requests read it at the same moment", async () => {
      const { queue, redis, scoped } = createQueue();

      await queue.enqueue(request, now);
      await queue.recordPage(await claimJob(queue, later(1)), lastPage());

      // Both requests read the job that is done before either writes it.
      let second: Promise<unknown> | undefined;
      scoped.beforeNextScript(async () => {
        second = queue.enqueue({ ...request, requestedBy: "user-2" }, later(2));
        await second;
      });

      const first = await queue.enqueue(request, later(2));

      await expect(second).resolves.toMatchObject({
        enqueued: true,
        job: { requestedBy: "user-2", version: 4 },
      });
      expect(first).toMatchObject({
        enqueued: false,
        job: { requestedBy: "user-2" },
      });
      await expect(
        redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1)
      ).resolves.toStrictEqual([jobId]);
    });

    it("requeues a job once when two requests are made at the same moment", async () => {
      const { queue, redis } = createQueue();

      await queue.enqueue(request, now);
      await queue.recordPage(await claimJob(queue, later(1)), lastPage());

      const results = await Promise.all([
        queue.enqueue(request, later(2)),
        queue.enqueue({ ...request, requestedBy: "user-2" }, later(2)),
      ]);

      expect(results.filter((result) => result.enqueued)).toHaveLength(1);
      await expect(
        redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1)
      ).resolves.toStrictEqual([jobId]);
    });
  });
});

describe(getBackfillJobId, () => {
  it("identifies a job by platform and account", () => {
    expect(jobId).toBe("youtube:channel-row-1");
  });
});

describe("the transitions of the jobs", () => {
  it("lets a job be requested again from any status", () => {
    for (const status of ["done", "failed", "pending", "running"] as const) {
      expect(canTransition("enqueue", status)).toBeTruthy();
    }
  });

  it("lets a worker move only a job it claimed", () => {
    for (const operation of [
      "complete",
      "fail",
      "recordPage",
      "requeue",
    ] as const) {
      expect(canTransition(operation, "running")).toBeTruthy();

      for (const status of ["done", "failed", "pending"] as const) {
        expect(canTransition(operation, status)).toBeFalsy();
      }
    }
  });

  it("does not hand out a job that finished", () => {
    expect(canTransition("claim", "pending")).toBeTruthy();
    expect(canTransition("claim", "done")).toBeFalsy();
    expect(canTransition("claim", "failed")).toBeFalsy();
  });

  it("names the status each operation moves a job to", () => {
    expect(
      Object.fromEntries(
        Object.entries(BACKFILL_JOB_TRANSITIONS).map(([operation, { to }]) => [
          operation,
          to,
        ])
      )
    ).toStrictEqual({
      claim: "running",
      complete: "done",
      enqueue: "pending",
      fail: "failed",
      recordPage: "running",
      requeue: "pending",
    });
  });
});

describe(getJobActivity, () => {
  it("tells a job that is queued or being read", () => {
    expect(
      getJobActivity(jobAt("pending"), { locked: false, now })
    ).toStrictEqual({
      active: true,
      status: "pending",
    });
    expect(
      getJobActivity(jobAt("running"), { locked: true, now })
    ).toStrictEqual({
      active: true,
      status: "running",
    });
  });

  it("tells a job that stopped without finishing as interrupted", () => {
    // Its worker died and the lock ran out.
    expect(
      getJobActivity(jobAt("running"), { locked: false, now })
    ).toStrictEqual({
      active: false,
      status: "interrupted",
    });
    // It waited too long in the queue.
    expect(
      getJobActivity(jobAt("pending", 61), { locked: false, now })
    ).toStrictEqual({
      active: false,
      status: "interrupted",
    });
  });

  it("tells a job that finished as it finished", () => {
    expect(getJobActivity(jobAt("done"), { locked: false, now })).toStrictEqual(
      {
        active: false,
        status: "done",
      }
    );
    expect(
      getJobActivity(jobAt("failed"), { locked: true, now })
    ).toStrictEqual({
      active: false,
      status: "failed",
    });
  });
});

describe("BackfillQueue options", () => {
  it("locks a claim for as long as a worker may run by default, and a little more", () => {
    const queue = new BackfillQueue({} as never);

    expect(queue.leaseSeconds).toBe(
      BACKFILL_DEFAULT_MAX_RUN_SECONDS + BACKFILL_LEASE_MARGIN_SECONDS
    );
    expect(queue.maxAttempts).toBe(BACKFILL_MAX_ATTEMPTS);
  });
});
