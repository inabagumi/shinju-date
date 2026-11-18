import { REDIS_KEYS } from "@shinju-date/constants";
import { describe, expect, it, vi } from "vitest";

import {
  describeOnEachRedis,
  expectTtl,
  useScopedRedis,
} from "../test/redis.js";
import {
  BACKFILL_JOB_TTL_SECONDS,
  BACKFILL_RUN_LOCK_SECONDS,
  BackfillQueue,
  BackfillRuns,
  getBackfillJobId,
  getBackfillRunResultKeys,
  getRunResultKey,
} from "./index.js";
import type { BackfillClaim, BackfillRunRequest } from "./index.js";

const now = Temporal.Instant.from("2026-11-14T00:00:00Z");
const later = (minutes: number) => now.add({ minutes });

const requests: BackfillRunRequest[] = [
  { accountId: "channel-row-1", provider: "youtube", talentId: "talent-1" },
  { accountId: "twitch-row-1", provider: "twitch", talentId: "talent-1" },
  { accountId: "channel-row-2", provider: "youtube", talentId: "talent-2" },
];
const youtubeJobId = getBackfillJobId("youtube", "channel-row-1");
const twitchJobId = getBackfillJobId("twitch", "twitch-row-1");
const otherJobId = getBackfillJobId("youtube", "channel-row-2");

/**
 * Claims the job with the given ID, failing the test when it is not queued.
 * A check queues its jobs at the same time, so on Redis they are not queued
 * in the order of the accounts; the jobs claimed before it are put back.
 */
async function claimJob(
  queue: BackfillQueue,
  id: string,
  at: Temporal.Instant
): Promise<BackfillClaim> {
  const skipped: BackfillClaim[] = [];

  try {
    while (true) {
      const claim = await queue.claim(at);

      if (!claim) {
        throw new Error(`Expected ${id} to be queued`);
      }

      if (claim.job.id === id) {
        return claim;
      }

      skipped.push(claim);
    }
  } finally {
    for (const claim of skipped) {
      await queue.requeue(claim, at);
    }
  }
}

/**
 * Records a page of a claimed job, failing the test when the lock was lost.
 *
 * @returns The claim to keep writing with.
 */
async function recordPage(
  queue: BackfillQueue,
  claim: BackfillClaim,
  added: number,
  nextCursor: string | null,
  at: Temporal.Instant
): Promise<BackfillClaim> {
  const result = await queue.recordPage(
    claim,
    { added, done: nextCursor === null, nextCursor },
    at
  );

  if (result.status !== "saved") {
    throw new Error("Expected the page to be saved");
  }

  return { job: result.job, token: claim.token };
}

/** Starts a check, failing the test when it does not start. */
async function startRun(runs: BackfillRuns, at: Temporal.Instant = now) {
  const result = await runs.start(requests, { requestedBy: "user-1" }, at);

  if (result.status !== "started") {
    throw new Error(`Expected the check to start, got ${result.status}`);
  }

  return result.run;
}

describeOnEachRedis((createClient) => {
  describe(BackfillRuns, () => {
    const getScopedRedis = useScopedRedis(createClient);

    function createRuns() {
      const scoped = getScopedRedis();
      const { redis } = scoped;
      // The queue of the workers, which keeps the outcomes of the jobs.
      const queue = new BackfillQueue(redis, {
        finishedJobKeys: getBackfillRunResultKeys,
      });

      return { queue, redis, runs: new BackfillRuns(redis, queue), scoped };
    }

    it("queues one job per account and keeps the check as the latest", async () => {
      const { redis, runs } = createRuns();

      const result = await runs.start(requests, { requestedBy: "user-1" }, now);

      expect(result).toStrictEqual({
        failed: 0,
        run: {
          failed: 0,
          id: expect.any(String),
          jobs: [
            {
              accountId: "channel-row-1",
              addedBefore: 0,
              id: youtubeJobId,
              provider: "youtube",
              talentId: "talent-1",
            },
            {
              accountId: "twitch-row-1",
              addedBefore: 0,
              id: twitchJobId,
              provider: "twitch",
              talentId: "talent-1",
            },
            {
              accountId: "channel-row-2",
              addedBefore: 0,
              id: otherJobId,
              provider: "youtube",
              talentId: "talent-2",
            },
          ],
          requestedAt: now.toString(),
          requestedBy: "user-1",
          skipped: 0,
        },
        skipped: 0,
        status: "started",
      });
      await expect(
        redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1)
      ).resolves.toHaveLength(3);
      await expectTtl(
        redis,
        REDIS_KEYS.VIDEO_BACKFILL_RUN,
        BACKFILL_JOB_TTL_SECONDS
      );
      // The lock is released once the check is saved.
      await expect(
        redis.exists(REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK)
      ).resolves.toBe(0);

      const progress = await runs.getLatest(now);

      expect(progress).toMatchObject({
        active: true,
        added: 0,
        counts: { done: 0, failed: 0, interrupted: 0, pending: 3, running: 0 },
      });
      expect(
        progress?.jobs.every(
          (job) => job.active && job.status === "pending" && job.added === 0
        )
      ).toBeTruthy();
    });

    it("tags the jobs with the check", async () => {
      const { queue, runs } = createRuns();

      const run = await startRun(runs);

      await expect(queue.getJobs([youtubeJobId], now)).resolves.toStrictEqual([
        {
          active: true,
          job: expect.objectContaining({
            requestedBy: "user-1",
            runId: run.id,
          }),
          status: "pending",
        },
      ]);
    });

    it("has no latest check before one is requested", async () => {
      const { runs } = createRuns();

      await expect(runs.getLatest(now)).resolves.toBeNull();
    });

    it("refuses a new check while the latest one is in progress", async () => {
      const { redis, runs } = createRuns();

      const run = await startRun(runs);
      const queued = (
        await redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1)
      ).length;

      await expect(
        runs.start(requests, { requestedBy: "user-2" }, later(1))
      ).resolves.toMatchObject({
        progress: { active: true, run: { id: run.id } },
        status: "active",
      });
      await expect(
        redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1)
      ).resolves.toHaveLength(queued);
    });

    it("refuses a check while another request for one is being handled", async () => {
      const { redis, runs } = createRuns();

      await redis.set(REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK, "other", {
        ex: BACKFILL_RUN_LOCK_SECONDS,
        nx: true,
      });

      await expect(
        runs.start(requests, { requestedBy: "user-1" }, now)
      ).resolves.toStrictEqual({ status: "busy" });
      await expect(redis.exists(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)).resolves.toBe(
        0
      );
      // Another request's lock is left alone.
      await expect(redis.get(REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK)).resolves.toBe(
        "other"
      );
    });

    it("starts requests for a check made at the same moment once", async () => {
      const { runs } = createRuns();

      const results = await Promise.all([
        runs.start(requests, { requestedBy: "user-1" }, now),
        runs.start(requests, { requestedBy: "user-2" }, now),
      ]);

      expect(results.map((result) => result.status).sort()).toStrictEqual([
        "busy",
        "started",
      ]);
    });

    it("leaves out accounts that are queued or being read already", async () => {
      const { queue, runs } = createRuns();

      // Requested from the talent page before the check.
      await queue.enqueue(
        {
          accountId: "twitch-row-1",
          provider: "twitch",
          requestedBy: "user-2",
          talentId: "talent-1",
        },
        now
      );

      const result = await runs.start(requests, { requestedBy: "user-1" }, now);

      expect(result).toMatchObject({ skipped: 1, status: "started" });
      expect(
        result.status === "started" && result.run.jobs.map((job) => job.id)
      ).toStrictEqual([youtubeJobId, otherJobId]);
    });

    it("saves no check when no account could be queued", async () => {
      const { queue, redis, runs } = createRuns();

      for (const request of requests) {
        await queue.enqueue({ ...request, requestedBy: "user-2" }, now);
      }

      await expect(
        runs.start(requests, { requestedBy: "user-1" }, now)
      ).resolves.toStrictEqual({ failed: 0, skipped: 3, status: "empty" });
      await expect(redis.exists(REDIS_KEYS.VIDEO_BACKFILL_RUN)).resolves.toBe(
        0
      );
      await expect(
        redis.exists(REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK)
      ).resolves.toBe(0);
    });

    it("reports the accounts that could not be queued and starts the rest", async () => {
      const { queue, runs } = createRuns();
      const error = new Error("Redis is down");
      const enqueue = queue.enqueue.bind(queue);

      vi.spyOn(queue, "enqueue").mockImplementation((request, at) =>
        request.accountId === "twitch-row-1"
          ? Promise.reject(error)
          : enqueue(request, at)
      );
      const onError =
        vi.fn<(request: BackfillRunRequest, error: unknown) => void>();

      await expect(
        runs.start(requests, { onError, requestedBy: "user-1" }, now)
      ).resolves.toMatchObject({
        failed: 1,
        run: { failed: 1, jobs: [{ id: youtubeJobId }, { id: otherJobId }] },
        status: "started",
      });
      expect(onError).toHaveBeenCalledExactlyOnceWith(requests[1], error);
    });

    it("does not release a lock that another request took after its own ran out", async () => {
      const { queue, redis, runs } = createRuns();
      const enqueue = queue.enqueue.bind(queue);

      vi.spyOn(queue, "enqueue").mockImplementation(async (request, at) => {
        // The lock ran out while accounts were queued, and another request
        // for a check took it.
        await redis.set(REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK, "other");

        return enqueue(request, at);
      });

      await expect(
        runs.start(requests, { requestedBy: "user-1" }, now)
      ).resolves.toMatchObject({ status: "started" });
      await expect(redis.get(REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK)).resolves.toBe(
        "other"
      );
    });

    it("releases the lock when the check cannot be saved", async () => {
      const { redis, runs } = createRuns();
      const set = redis.set.bind(redis);

      vi.spyOn(redis, "set").mockImplementation((key, value, options) =>
        key === REDIS_KEYS.VIDEO_BACKFILL_RUN
          ? Promise.reject(new Error("Redis is down"))
          : set(key, value, options)
      );

      await expect(
        runs.start(requests, { requestedBy: "user-1" }, now)
      ).rejects.toThrow("Redis is down");
      await expect(
        redis.exists(REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK)
      ).resolves.toBe(0);
    });

    it("counts the jobs by status and the videos they added", async () => {
      const { queue, runs } = createRuns();

      await startRun(runs);

      // Jobs are claimed in the order they were queued.
      const youtube = await claimJob(queue, youtubeJobId, later(1));
      await recordPage(queue, youtube, 4, null, later(2));
      const twitch = await claimJob(queue, twitchJobId, later(2));
      await queue.recordFailure(
        await recordPage(queue, twitch, 1, "page-2", later(3)),
        new Error("quota exceeded"),
        { permanent: true },
        later(3)
      );
      const other = await recordPage(
        queue,
        await claimJob(queue, otherJobId, later(3)),
        2,
        "page-2",
        later(4)
      );

      await expect(runs.getLatest(later(5))).resolves.toMatchObject({
        active: true,
        added: 7,
        counts: { done: 1, failed: 1, interrupted: 0, pending: 0, running: 1 },
        jobs: [
          { active: false, added: 4, id: youtubeJobId, status: "done" },
          {
            active: false,
            added: 1,
            error: "quota exceeded",
            id: twitchJobId,
            status: "failed",
          },
          { active: true, added: 2, id: otherJobId, status: "running" },
        ],
      });

      await recordPage(queue, other, 0, null, later(6));

      await expect(runs.getLatest(later(7))).resolves.toMatchObject({
        active: false,
        counts: { done: 2, failed: 1, running: 0 },
      });
    });

    it("shows a job whose worker died as interrupted and lets a new check resume it", async () => {
      const { queue, redis, runs } = createRuns();

      await startRun(runs);
      const job = await claimJob(queue, youtubeJobId, later(1));
      await recordPage(queue, job, 3, "page-2", later(2));
      // Every lease ran out and the other jobs were lost.
      await redis.del(`${REDIS_KEYS.VIDEO_BACKFILL_LOCK_PREFIX}${job.job.id}`);
      await redis.del(REDIS_KEYS.VIDEO_BACKFILL_QUEUE);

      await expect(runs.getLatest(later(90))).resolves.toMatchObject({
        active: false,
        counts: { interrupted: 3 },
      });

      const run = await startRun(runs, later(91));

      expect(run.jobs[0]).toMatchObject({ addedBefore: 3, id: youtubeJobId });
      await expect(
        queue.getJobs([youtubeJobId], later(91))
      ).resolves.toStrictEqual([
        {
          active: true,
          job: expect.objectContaining({ cursor: "page-2", runId: run.id }),
          status: "pending",
        },
      ]);

      // Only what was added since the new check counts for it.
      const resumed = await claimJob(queue, youtubeJobId, later(92));
      await recordPage(queue, resumed, 2, null, later(93));

      await expect(runs.getLatest(later(94))).resolves.toMatchObject({
        jobs: [{ added: 2, id: youtubeJobId, status: "done" }, {}, {}],
      });
    });

    it("follows a failed job that is requested again on its own", async () => {
      const { queue, runs } = createRuns();

      await startRun(runs);
      const job = await claimJob(queue, youtubeJobId, later(1));
      await queue.recordFailure(
        await recordPage(queue, job, 0, "page-2", later(2)),
        "error",
        { permanent: true },
        later(2)
      );

      await queue.enqueue(
        {
          accountId: "channel-row-1",
          provider: "youtube",
          requestedBy: "user-2",
          talentId: "talent-1",
        },
        later(3)
      );

      await expect(runs.getLatest(later(4))).resolves.toMatchObject({
        counts: { failed: 0, pending: 3 },
        jobs: [{ active: true, error: null, status: "pending" }, {}, {}],
      });
    });

    it("keeps a finished job as it finished when it is requested again on its own", async () => {
      const { queue, runs } = createRuns();

      await startRun(runs);
      const job = await claimJob(queue, youtubeJobId, later(1));
      await recordPage(queue, job, 4, null, later(2));

      // Starts over from the newest videos, outside the check.
      await queue.enqueue(
        {
          accountId: "channel-row-1",
          provider: "youtube",
          requestedBy: "user-2",
          talentId: "talent-1",
        },
        later(3)
      );

      await expect(runs.getLatest(later(4))).resolves.toMatchObject({
        added: 4,
        counts: { done: 1, pending: 2 },
        jobs: [{ active: false, added: 4, status: "done" }, {}, {}],
      });
    });

    it("keeps the outcome of a job of a check when it finishes", async () => {
      const { queue, redis, runs } = createRuns();

      const run = await startRun(runs);
      const job = await claimJob(queue, youtubeJobId, later(1));
      const done = await recordPage(queue, job, 3, null, later(2));
      const resultKey = getRunResultKey(run.id, youtubeJobId);

      await expect(redis.get(resultKey)).resolves.toStrictEqual(done.job);
      await expectTtl(redis, resultKey, BACKFILL_JOB_TTL_SECONDS);
    });

    it("keeps no outcome for a job without a check", async () => {
      const { queue, scoped } = createRuns();

      await queue.enqueue(
        {
          accountId: "channel-row-1",
          provider: "youtube",
          requestedBy: "user-1",
          talentId: "talent-1",
        },
        now
      );
      const job = await claimJob(queue, youtubeJobId, later(1));
      await recordPage(queue, job, 3, null, later(2));

      expect(
        scoped
          .keys()
          .filter((key) =>
            key.startsWith(REDIS_KEYS.VIDEO_BACKFILL_RUN_RESULT_PREFIX)
          )
      ).toStrictEqual([]);
    });

    it("shows a job that is gone as interrupted", async () => {
      const { redis, runs } = createRuns();

      await startRun(runs);
      await redis.del(`${REDIS_KEYS.VIDEO_BACKFILL_JOB_PREFIX}${youtubeJobId}`);

      await expect(runs.getLatest(now)).resolves.toMatchObject({
        counts: { interrupted: 1, pending: 2 },
        jobs: [
          { active: false, added: 0, status: "interrupted", updatedAt: null },
          {},
          {},
        ],
      });
    });
  });
});
