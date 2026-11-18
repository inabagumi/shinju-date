import type { Redis } from "@upstash/redis";

import {
  BACKFILL_MAX_ATTEMPTS,
  createRequestedJob,
  getJobActivity,
  moveJob,
  withFailure,
  withPage,
} from "./jobs.js";
import { getBackfillJobId, getLeaseSeconds } from "./keys.js";
import {
  claimJob,
  enqueueJob,
  finishJob,
  readJobs,
  requeueJob,
  saveJob,
} from "./scripts.js";
import type {
  BackfillClaim,
  BackfillFailureOptions,
  BackfillJobState,
  BackfillPage,
  BackfillQueueOptions,
  BackfillRequest,
  BackfillWriteResult,
  EnqueueResult,
} from "./types.js";

/**
 * Queue of backfill jobs in Redis, one job per platform account.
 *
 * The admin app requests jobs ({@link enqueue}) and shows their progress
 * ({@link getJobs}); the batch app works them off a page at a time:
 * {@link claim} a job, read pages and record each one ({@link recordPage})
 * while its time lasts, then {@link requeue} it to continue in a later run.
 * A page that cannot be read is recorded with {@link recordFailure}, which
 * retries the job in a later run or gives it up. Jobs are read in turns, so
 * one long history does not hold up the others. Every write follows
 * `BACKFILL_JOB_TRANSITIONS`.
 *
 * A claimed job is locked for {@link leaseSeconds} with a token made for the
 * claim ({@link BackfillClaim}), so it is never read twice at once, and the
 * writes of a worker whose lease ran out are ignored and return `lost`.
 */
export class BackfillQueue {
  /** How long a claim is locked, in seconds. */
  readonly leaseSeconds: number;
  /** Failures in a row that a job may have before it is given up. */
  readonly maxAttempts: number;
  readonly #finishedJobKeys: BackfillQueueOptions["finishedJobKeys"];
  readonly #redis: Redis;

  constructor(
    redis: Redis,
    {
      finishedJobKeys,
      maxAttempts = BACKFILL_MAX_ATTEMPTS,
      maxRunSeconds,
    }: BackfillQueueOptions = {}
  ) {
    this.leaseSeconds = getLeaseSeconds(maxRunSeconds);
    this.maxAttempts = maxAttempts;
    this.#finishedJobKeys = finishedJobKeys;
    this.#redis = redis;
  }

  /** Gets jobs by ID, in the same order; `null` for IDs without a job. */
  async getJobs(
    ids: readonly string[],
    now: Temporal.Instant = Temporal.Now.instant()
  ): Promise<(BackfillJobState | null)[]> {
    const stored = await readJobs(this.#redis, ids);

    return stored.map(
      (entry) =>
        entry && {
          ...getJobActivity(entry.job, { locked: entry.locked, now }),
          job: entry.job,
        }
    );
  }

  /**
   * Queues a job for an account, unless one is queued or being read already.
   * A job that failed or was interrupted resumes where it stopped; a job that
   * is done starts over from the newest videos.
   */
  async enqueue(
    request: BackfillRequest,
    now: Temporal.Instant = Temporal.Now.instant()
  ): Promise<EnqueueResult> {
    const id = getBackfillJobId(request.provider, request.accountId);
    const [current] = await this.getJobs([id], now);

    if (current?.active) {
      return { enqueued: false, job: current.job };
    }

    const queued = await enqueueJob(
      this.#redis,
      createRequestedJob(request, current?.job ?? null, now),
      current?.job ?? null
    );

    if (queued) {
      return { enqueued: true, job: queued };
    }

    const [latest] = await this.getJobs([id], now);

    return { enqueued: false, job: latest?.job ?? null };
  }

  /**
   * Takes the next job off the queue, locks it with a token of its own and
   * marks it `running`, in one call to Redis; `null` when the queue is empty.
   */
  async claim(
    now: Temporal.Instant = Temporal.Now.instant()
  ): Promise<BackfillClaim | null> {
    return claimJob(this.#redis, { leaseSeconds: this.leaseSeconds, now });
  }

  /**
   * Records a page of a claimed job that was read. When the history ended
   * with it, the job is done and released; otherwise it stays claimed, to
   * read the next page or to {@link requeue} it. When the progress cannot be
   * saved, the job is put back in the queue with it if possible, so that it
   * does not wait until it is requested again, and the error is thrown.
   */
  async recordPage(
    { job, token }: BackfillClaim,
    page: BackfillPage,
    now: Temporal.Instant = Temporal.Now.instant()
  ): Promise<BackfillWriteResult> {
    const progressed = withPage(job, page);

    if (page.done) {
      return this.#finish({ job: progressed, token }, "complete", now);
    }

    const saved = moveJob(progressed, "recordPage", now);

    return saveJob(this.#redis, { job: saved, token }).catch(async (error) => {
      // Otherwise the job would stay claimed until its lease expires.
      await this.requeue({ job: progressed, token }, now).catch(() => {});

      throw error;
    });
  }

  /**
   * Records a page of a claimed job that could not be read, and releases the
   * job: it is given up (`failed`) when the error is permanent or the
   * attempts reached {@link maxAttempts}, and put back in the queue to retry
   * in a later run otherwise.
   */
  async recordFailure(
    { job, token }: BackfillClaim,
    error: unknown,
    { permanent = false }: BackfillFailureOptions = {},
    now: Temporal.Instant = Temporal.Now.instant()
  ): Promise<BackfillWriteResult> {
    const failed = withFailure(job, error);

    return permanent || failed.attempts >= this.maxAttempts
      ? this.#finish({ job: failed, token }, "fail", now)
      : this.requeue({ job: failed, token }, now);
  }

  /**
   * Puts a claimed job back at the end of the queue, to continue in a later
   * run, and releases it.
   */
  async requeue(
    { job, token }: BackfillClaim,
    now: Temporal.Instant = Temporal.Now.instant()
  ): Promise<BackfillWriteResult> {
    const pending = moveJob(job, "requeue", now);

    return requeueJob(this.#redis, { job: pending, token });
  }

  /** Saves a job as `done` or `failed`, with its copies, and releases it. */
  #finish(
    { job, token }: BackfillClaim,
    operation: "complete" | "fail",
    now: Temporal.Instant
  ): Promise<BackfillWriteResult> {
    const finished = moveJob(job, operation, now);

    return finishJob(
      this.#redis,
      { job: finished, token },
      this.#finishedJobKeys?.(finished)
    );
  }
}
