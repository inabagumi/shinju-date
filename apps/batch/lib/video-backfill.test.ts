import type * as Sentry from "@sentry/nextjs";
import { REDIS_KEYS } from "@shinju-date/constants";
import { AccountNotFoundError } from "@shinju-date/scraper";
import type { Scraper } from "@shinju-date/scraper";
import {
  BACKFILL_MAX_ATTEMPTS,
  BackfillQueue,
} from "@shinju-date/video-backfill";
import type { BackfillClaim, BackfillJob } from "@shinju-date/video-backfill";
import { FakeRedis } from "@shinju-date/video-backfill/testing";
import type { Redis } from "@upstash/redis";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WorkOffBackfillQueueOptions } from "./video-backfill";

const { createLoggerMock } = await vi.hoisted(() => import("@/test/mocks"));

type OnFinish = NonNullable<WorkOffBackfillQueueOptions["onFinish"]>;

const captureException = vi.fn<typeof Sentry.captureException>();
const logger = createLoggerMock();

vi.mock(import("@sentry/nextjs"), () => ({ captureException }));
vi.mock(import("@shinju-date/logger"), () => ({ logger }));

const { BACKFILL_SENTRY_TAG, workOffBackfillQueue } =
  await import("./video-backfill");

const youtubeId = "youtube:channel-row-1";
const twitchId = "twitch:twitch-row-1";

const createJob = (overrides: Partial<BackfillJob> = {}): BackfillJob => ({
  accountId: "channel-row-1",
  added: 0,
  attempts: 0,
  cursor: null,
  error: null,
  finishedAt: null,
  id: youtubeId,
  pages: 0,
  provider: "youtube",
  requestedAt: "2026-11-14T00:00:00Z",
  requestedBy: "user-1",
  startedAt: null,
  status: "pending",
  talentId: "talent-1",
  updatedAt: Temporal.Now.instant().toString(),
  ...overrides,
});

const createTwitchJob = (overrides: Partial<BackfillJob> = {}): BackfillJob =>
  createJob({
    accountId: "twitch-row-1",
    id: twitchId,
    provider: "twitch",
    ...overrides,
  });

/** A claim of a job whose job has the given fields. */
const claimOf = (fields: Partial<BackfillJob>) => ({
  job: expect.objectContaining(fields),
  token: expect.any(String),
});

/**
 * A queue on {@link FakeRedis} that holds the given jobs, queued in order,
 * so that the batch is tested with the policy of the queue.
 */
const createQueue = async (jobs: BackfillJob[]) => {
  const redis = new FakeRedis() as Partial<Redis> as Redis;

  await Promise.all(
    jobs.map((job) =>
      redis.set(`${REDIS_KEYS.VIDEO_BACKFILL_JOB_PREFIX}${job.id}`, job)
    )
  );

  if (jobs.length > 0) {
    // Pushes them to the head one by one, in order, like an LPUSH for each.
    await redis.lpush(
      REDIS_KEYS.VIDEO_BACKFILL_QUEUE,
      ...jobs.map((job) => job.id)
    );
  }

  const queue = new BackfillQueue(redis);
  const spies = {
    claim: vi.spyOn(queue, "claim"),
    recordFailure: vi.spyOn(queue, "recordFailure"),
    recordPage: vi.spyOn(queue, "recordPage"),
    requeue: vi.spyOn(queue, "requeue"),
  };

  return {
    /** Lets the lease of a job run out. */
    expireLock: (id: string) =>
      redis.del(`${REDIS_KEYS.VIDEO_BACKFILL_LOCK_PREFIX}${id}`),
    /** The job as it is saved. */
    getJob: async (id: string) => {
      const [state] = await queue.getJobs([id]);

      return state?.job;
    },
    getQueued: () => redis.lrange(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, 0, -1),
    queue,
    spies,
  };
};

const createScraper = () => {
  const addPastVideos = vi.fn<Scraper["addPastVideos"]>();

  return {
    addPastVideos,
    getScraper: vi.fn<WorkOffBackfillQueueOptions["getScraper"]>(
      () => ({ addPastVideos }) as Partial<Scraper> as Scraper
    ),
  };
};

const farFuture = Temporal.Now.instant().add({ hours: 1 });

/** Works off a queue of one job whose videos fill two pages. */
const readTwoPages = async () => {
  const queued = await createQueue([createJob()]);
  const scraper = createScraper();

  scraper.addPastVideos
    .mockResolvedValueOnce({ added: 3, cursor: "page-2", listed: 50 })
    .mockResolvedValueOnce({ added: 1, cursor: null, listed: 10 });

  const result = await workOffBackfillQueue({
    deadline: farFuture,
    getScraper: scraper.getScraper,
    queue: queued.queue,
  });

  return { ...queued, ...scraper, result };
};

describe("workOffBackfillQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads every page of a job", async () => {
    const { addPastVideos, getScraper, result, spies } = await readTwoPages();

    expect(result).toStrictEqual({ added: 4, jobs: 1 });
    expect(getScraper).toHaveBeenCalledWith("youtube");
    expect(addPastVideos.mock.calls).toStrictEqual([
      [expect.objectContaining({ accountId: "channel-row-1", cursor: null })],
      [expect.objectContaining({ cursor: "page-2" })],
    ]);
    expect(spies.recordPage.mock.calls).toStrictEqual([
      [
        claimOf({ added: 0, cursor: null, pages: 0 }),
        { added: 3, done: false, nextCursor: "page-2" },
      ],
      [
        claimOf({ added: 3, cursor: "page-2", pages: 1 }),
        { added: 1, done: true, nextCursor: null },
      ],
    ]);
  });

  it("completes a job after its last page", async () => {
    const { getJob, getQueued, spies } = await readTwoPages();

    expect(spies.requeue).not.toHaveBeenCalled();
    await expect(getJob(youtubeId)).resolves.toMatchObject({
      added: 4,
      cursor: null,
      pages: 2,
      status: "done",
    });
    await expect(getQueued()).resolves.toStrictEqual([]);
  });

  it("puts a job back with its cursor when the time is up", async () => {
    const { getJob, getQueued, queue, spies } = await createQueue([
      createJob({ added: 5, pages: 2 }),
    ]);
    const { addPastVideos, getScraper } = createScraper();
    const start = Temporal.Instant.from("2026-11-14T00:00:00Z");
    const deadline = start.add({ seconds: 50 });
    let now = start;

    addPastVideos.mockImplementation(() => {
      // Reading the page takes the rest of the time.
      now = deadline;

      return Promise.resolve({ added: 2, cursor: "page-4", listed: 50 });
    });

    await expect(
      workOffBackfillQueue({
        clock: () => now,
        deadline,
        getScraper,
        queue,
      })
    ).resolves.toStrictEqual({ added: 2, jobs: 1 });

    expect(addPastVideos).toHaveBeenCalledOnce();
    expect(spies.requeue).toHaveBeenCalledWith(
      claimOf({ added: 7, cursor: "page-4", pages: 3 })
    );
    await expect(getJob(youtubeId)).resolves.toMatchObject({
      added: 7,
      cursor: "page-4",
      pages: 3,
      status: "pending",
    });
    await expect(getQueued()).resolves.toStrictEqual([youtubeId]);
  });

  it("stops when a page cannot be recorded", async () => {
    const { queue, spies } = await createQueue([createJob()]);
    const { addPastVideos, getScraper } = createScraper();

    addPastVideos.mockResolvedValue({ added: 3, cursor: "page-2", listed: 50 });
    spies.recordPage.mockRejectedValue(new Error("redis unavailable"));

    await expect(
      workOffBackfillQueue({ deadline: farFuture, getScraper, queue })
    ).rejects.toThrow("redis unavailable");
  });

  it("takes turns between jobs and works on each at most once per run", async () => {
    const { getJob, getQueued, queue } = await createQueue([
      createJob(),
      createTwitchJob(),
    ]);
    const { addPastVideos, getScraper } = createScraper();

    addPastVideos.mockRejectedValueOnce(new Error("quota exceeded"));
    addPastVideos.mockResolvedValueOnce({ added: 0, cursor: null, listed: 0 });

    await expect(
      workOffBackfillQueue({ deadline: farFuture, getScraper, queue })
    ).resolves.toStrictEqual({ added: 0, jobs: 2 });

    expect(getScraper).toHaveBeenCalledWith("twitch");
    // The failed job came around again and was left for the next run.
    expect(addPastVideos).toHaveBeenCalledTimes(2);
    await expect(getJob(youtubeId)).resolves.toMatchObject({
      attempts: 1,
      error: "quota exceeded",
      status: "pending",
    });
    await expect(getQueued()).resolves.toStrictEqual([youtubeId]);
  });

  it("gives a job up after repeated failures", async () => {
    const { getJob, getQueued, queue } = await createQueue([
      createJob({ attempts: BACKFILL_MAX_ATTEMPTS - 1, cursor: "page-9" }),
    ]);
    const { addPastVideos, getScraper } = createScraper();

    addPastVideos.mockRejectedValue(new Error("quota exceeded"));

    await workOffBackfillQueue({ deadline: farFuture, getScraper, queue });

    await expect(getJob(youtubeId)).resolves.toMatchObject({
      attempts: BACKFILL_MAX_ATTEMPTS,
      cursor: "page-9",
      error: "quota exceeded",
      status: "failed",
    });
    await expect(getQueued()).resolves.toStrictEqual([]);
  });

  it("retries a job that failed fewer times than allowed", async () => {
    const { getJob, queue } = await createQueue([
      createJob({ attempts: BACKFILL_MAX_ATTEMPTS - 2, cursor: "page-9" }),
    ]);
    const { addPastVideos, getScraper } = createScraper();

    addPastVideos.mockRejectedValue(new Error("quota exceeded"));

    await workOffBackfillQueue({ deadline: farFuture, getScraper, queue });

    await expect(getJob(youtubeId)).resolves.toMatchObject({
      attempts: BACKFILL_MAX_ATTEMPTS - 1,
      cursor: "page-9",
      status: "pending",
    });
  });

  it("gives a job up at once when the account is gone", async () => {
    const { getJob, queue, spies } = await createQueue([createJob()]);
    const { addPastVideos, getScraper } = createScraper();
    const error = new AccountNotFoundError("channel-row-1");

    addPastVideos.mockRejectedValue(error);

    await workOffBackfillQueue({ deadline: farFuture, getScraper, queue });

    expect(spies.recordFailure).toHaveBeenCalledWith(
      claimOf({ attempts: 0 }),
      error,
      { permanent: true }
    );
    await expect(getJob(youtubeId)).resolves.toMatchObject({
      attempts: 1,
      error: "Account not found: channel-row-1",
      status: "failed",
    });
  });

  it("does nothing while the queue is empty", async () => {
    const { queue, spies } = await createQueue([]);
    const { getScraper } = createScraper();

    await expect(
      workOffBackfillQueue({ deadline: farFuture, getScraper, queue })
    ).resolves.toStrictEqual({ added: 0, jobs: 0 });

    expect(spies.claim).toHaveBeenCalledOnce();
    expect(getScraper).not.toHaveBeenCalled();
  });

  it("reports the jobs that finish with how they finished", async () => {
    const { queue } = await createQueue([createJob(), createTwitchJob()]);
    const { addPastVideos, getScraper } = createScraper();
    const onFinish = vi.fn<OnFinish>();

    addPastVideos
      .mockResolvedValueOnce({ added: 2, cursor: null, listed: 2 })
      .mockRejectedValueOnce(new AccountNotFoundError("twitch-row-1"));

    await workOffBackfillQueue({
      deadline: farFuture,
      getScraper,
      onFinish,
      queue,
    });

    expect(onFinish.mock.calls).toStrictEqual([
      [
        expect.objectContaining({
          added: 2,
          finishedAt: expect.any(String),
          id: youtubeId,
          status: "done",
        }),
      ],
      [
        expect.objectContaining({
          error: "Account not found: twitch-row-1",
          id: twitchId,
          status: "failed",
        }),
      ],
    ]);
  });

  it("does not report jobs that are put back to continue later", async () => {
    const { queue } = await createQueue([createJob()]);
    const { addPastVideos, getScraper } = createScraper();
    const onFinish = vi.fn<OnFinish>();

    addPastVideos.mockRejectedValue(new Error("quota exceeded"));

    await workOffBackfillQueue({
      deadline: farFuture,
      getScraper,
      onFinish,
      queue,
    });

    expect(onFinish).not.toHaveBeenCalled();
  });

  it("keeps working when a finished job cannot be reported", async () => {
    const { queue } = await createQueue([createJob(), createTwitchJob()]);
    const { addPastVideos, getScraper } = createScraper();
    const onFinish = vi
      .fn<OnFinish>()
      .mockRejectedValueOnce(new Error("database unavailable"));

    addPastVideos.mockResolvedValue({ added: 1, cursor: null, listed: 1 });

    await expect(
      workOffBackfillQueue({
        deadline: farFuture,
        getScraper,
        onFinish,
        queue,
      })
    ).resolves.toStrictEqual({ added: 2, jobs: 2 });

    expect(onFinish).toHaveBeenCalledTimes(2);
    expect(captureException).toHaveBeenCalledWith(
      new Error("database unavailable"),
      expect.anything()
    );
  });

  it("tags the error that made a job give up apart from retried ones", async () => {
    const { queue } = await createQueue([
      createJob(),
      createTwitchJob({ attempts: BACKFILL_MAX_ATTEMPTS - 1 }),
    ]);
    const { addPastVideos, getScraper } = createScraper();

    addPastVideos.mockRejectedValue(new Error("quota exceeded"));

    await workOffBackfillQueue({ deadline: farFuture, getScraper, queue });

    expect(captureException.mock.calls).toStrictEqual([
      [
        new Error("quota exceeded"),
        expect.objectContaining({
          level: "warning",
          tags: { [BACKFILL_SENTRY_TAG]: "retrying", provider: "youtube" },
        }),
      ],
      [
        new Error("quota exceeded"),
        expect.objectContaining({
          level: "error",
          tags: { [BACKFILL_SENTRY_TAG]: "failed", provider: "twitch" },
        }),
      ],
    ]);
  });

  it("reports the error of a page when recording it fails", async () => {
    const { queue, spies } = await createQueue([createJob()]);
    const { addPastVideos, getScraper } = createScraper();

    addPastVideos.mockRejectedValue(new Error("quota exceeded"));
    spies.recordFailure.mockRejectedValue(new Error("redis unavailable"));

    await expect(
      workOffBackfillQueue({ deadline: farFuture, getScraper, queue })
    ).rejects.toThrow("redis unavailable");

    expect(captureException).toHaveBeenCalledWith(
      new Error("quota exceeded"),
      expect.objectContaining({ level: "warning" })
    );
  });

  it("stops working on a job whose lock was lost and goes on to the next", async () => {
    const { expireLock, getJob, getQueued, queue } = await createQueue([
      createJob(),
      createTwitchJob(),
    ]);
    const { addPastVideos, getScraper } = createScraper();

    addPastVideos
      .mockImplementationOnce(async () => {
        // The lease runs out while the page is read.
        await expireLock(youtubeId);

        return { added: 3, cursor: "page-2", listed: 50 };
      })
      .mockResolvedValueOnce({ added: 1, cursor: null, listed: 1 });

    await expect(
      workOffBackfillQueue({ deadline: farFuture, getScraper, queue })
    ).resolves.toStrictEqual({ added: 4, jobs: 2 });

    // The first job was not read further nor put back.
    expect(addPastVideos).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ accountId: "twitch-row-1" })
    );
    await expect(
      Promise.all([getJob(youtubeId), getJob(twitchId)])
    ).resolves.toMatchObject([
      { cursor: null, status: "running" },
      { status: "done" },
    ]);
    await expect(getQueued()).resolves.toStrictEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("ロック"),
      expect.objectContaining({ jobId: youtubeId })
    );
  });

  it("passes the claim to every write", async () => {
    const { queue, spies } = await createQueue([createJob()]);
    const { addPastVideos, getScraper } = createScraper();

    addPastVideos
      .mockResolvedValueOnce({ added: 3, cursor: "page-2", listed: 50 })
      .mockResolvedValueOnce({ added: 1, cursor: null, listed: 1 });

    await workOffBackfillQueue({ deadline: farFuture, getScraper, queue });

    const claim = (await spies.claim.mock.results[0]?.value) as BackfillClaim;

    expect(spies.recordPage).toHaveBeenCalledTimes(2);
    for (const [written] of spies.recordPage.mock.calls) {
      expect(written.token).toBe(claim.token);
    }
  });

  it("does not report a job whose lock was lost when it finished", async () => {
    const { expireLock, queue } = await createQueue([
      createJob(),
      createTwitchJob(),
    ]);
    const { addPastVideos, getScraper } = createScraper();
    const onFinish = vi.fn<OnFinish>();

    addPastVideos
      .mockImplementationOnce(async () => {
        await expireLock(youtubeId);

        return { added: 1, cursor: null, listed: 1 };
      })
      .mockImplementationOnce(async () => {
        await expireLock(twitchId);

        throw new AccountNotFoundError("twitch-row-1");
      });

    await workOffBackfillQueue({
      deadline: farFuture,
      getScraper,
      onFinish,
      queue,
    });

    expect(onFinish).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });
});
