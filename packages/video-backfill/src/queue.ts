import { REDIS_KEYS } from '@shinju-date/constants'
import type { Redis } from '@upstash/redis'
import { Temporal } from 'temporal-polyfill'

/** Platform whose account a job reads, as in `videos.platform`. */
export type BackfillProvider = 'youtube' | 'twitch'

/**
 * - `pending`: waiting in the queue (for the first time, or to continue)
 * - `running`: a worker is reading it
 * - `done`: the whole history was read
 * - `failed`: given up; can be requested again to resume
 */
export type BackfillJobStatus = 'pending' | 'running' | 'done' | 'failed'

/**
 * A request to read the whole history of one platform account and save the
 * videos that are not saved yet.
 */
export interface BackfillJob {
  /** Primary key of the account row (`youtube_channels` / `twitch_users`). */
  accountId: string
  /** Videos saved so far. */
  added: number
  /** Consecutive runs that failed; reset by a page that succeeds. */
  attempts: number
  /** Where reading continues, or `null` to start from the newest videos. */
  cursor: string | null
  /** Why the job failed, when it did. */
  error: string | null
  finishedAt: string | null
  id: string
  /** Pages read so far. */
  pages: number
  provider: BackfillProvider
  requestedAt: string
  /** ID of the admin user who requested the job. */
  requestedBy: string | null
  /**
   * ID of the check of all accounts ({@link BackfillRun}) the job belongs to,
   * if any. Absent on jobs queued before such checks existed.
   */
  runId?: string | null
  startedAt: string | null
  status: BackfillJobStatus
  talentId: string
  updatedAt: string
}

export interface BackfillJobState {
  /**
   * Whether the job is queued or being read. An active job cannot be
   * requested again; a `pending` or `running` job that is not active was
   * interrupted (e.g. its worker timed out) and can be.
   */
  active: boolean
  job: BackfillJob
}

export interface BackfillRequest {
  accountId: string
  provider: BackfillProvider
  requestedBy: string | null
  /**
   * Check of all accounts the job is queued for. When omitted, a job that
   * resumes keeps the check it belonged to, so that the check follows it.
   */
  runId?: string | null
  talentId: string
}

export type EnqueueResult =
  | { enqueued: true; job: BackfillJob }
  /**
   * A job for the account is queued or being read already, or another request
   * for it changed it at the same moment.
   */
  | { enqueued: false; job: BackfillJob | null }

/** How long jobs and the queue are kept after their last change (7 days). */
export const BACKFILL_JOB_TTL_SECONDS = 7 * 24 * 60 * 60

/**
 * How long a worker holds a job it claimed. Must be longer than a worker may
 * run, so that a job is never read by two workers at once; a job whose worker
 * died is free again once it runs out.
 */
export const BACKFILL_LEASE_SECONDS = 6 * 60

/**
 * A job that waited this long in the queue is considered lost (e.g. dropped
 * by a worker that crashed) and may be requested again.
 */
export const BACKFILL_PENDING_TIMEOUT_SECONDS = 60 * 60

export function getBackfillJobId(
  provider: BackfillProvider,
  accountId: string,
): string {
  return `${provider}:${accountId}`
}

function jobKey(id: string): string {
  return `${REDIS_KEYS.VIDEO_BACKFILL_JOB_PREFIX}${id}`
}

function lockKey(id: string): string {
  return `${REDIS_KEYS.VIDEO_BACKFILL_LOCK_PREFIX}${id}`
}

/**
 * Key of the outcome of a job of a check of all accounts, kept when the job
 * finishes so the check still shows it after the job is requested again on
 * its own.
 */
export function getRunResultKey(runId: string, jobId: string): string {
  return `${REDIS_KEYS.VIDEO_BACKFILL_RUN_RESULT_PREFIX}${runId}:${jobId}`
}

/**
 * Saves a job and queues it, but only if the job is still what the caller
 * read (compare-and-set) and no worker holds it, so that two requests made at
 * the same moment, or a request that stalled, never save over each other or
 * over a worker's progress. Runs atomically on the Redis server.
 *
 * KEYS: job, queue, worker lock
 * ARGV: job as read (empty when there was none), new job, TTL, job ID
 *
 * @returns 1 when the job was queued, 0 when it changed in between.
 */
export const ENQUEUE_SCRIPT = `-- video-backfill:enqueue
local current = redis.call('GET', KEYS[1])
if ARGV[1] == '' then
  if current then return 0 end
elseif current ~= ARGV[1] then
  return 0
end
if redis.call('EXISTS', KEYS[3]) == 1 then return 0 end
-- LPUSH first: it is the only command here that can fail (WRONGTYPE), and
-- the script stops there without rolling back what ran before.
redis.call('LPUSH', KEYS[2], ARGV[4])
redis.call('EXPIRE', KEYS[2], ARGV[3])
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1`

/**
 * Puts a claimed job back at the end of the queue, saves it as pending and
 * releases it, atomically so a worker can claim it right away.
 *
 * `LPUSH` is the only command here that can fail (on a key of the wrong
 * type), and a script stops at a failing command without rolling back the
 * ones before it, so it runs first: when it fails nothing changed and the job
 * stays claimed until its lease runs out. A MULTI transaction would not do:
 * it runs the remaining commands after a failing one, which would leave the
 * job pending without a queue entry.
 *
 * KEYS: queue, job, worker lock
 * ARGV: job ID, job, TTL
 */
export const REQUEUE_SCRIPT = `-- video-backfill:requeue
redis.call('LPUSH', KEYS[1], ARGV[1])
redis.call('EXPIRE', KEYS[1], ARGV[3])
redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
redis.call('DEL', KEYS[3])
return 1`

function isActive(
  job: BackfillJob,
  locked: boolean,
  now: Temporal.Instant,
): boolean {
  switch (job.status) {
    case 'pending':
      return (
        Temporal.Instant.compare(
          Temporal.Instant.from(job.updatedAt).add({
            seconds: BACKFILL_PENDING_TIMEOUT_SECONDS,
          }),
          now,
        ) > 0
      )
    case 'running':
      return locked
    default:
      return false
  }
}

/**
 * Queue of backfill jobs in Redis, one job per platform account.
 *
 * The admin app requests jobs ({@link enqueue}) and shows their progress
 * ({@link getJobs}); the batch app works them off a page at a time:
 * {@link claim} a job, read pages while its time lasts, then either
 * {@link complete} it, {@link fail} it or {@link requeue} it to continue in a
 * later run. Jobs are read in turns, so one long history does not hold up the
 * others.
 *
 * A claimed job is locked for {@link BACKFILL_LEASE_SECONDS}, so it is never
 * read twice at once even if it was queued twice.
 */
export class BackfillQueue {
  readonly #redis: Redis

  constructor(redis: Redis) {
    this.#redis = redis
  }

  /**
   * Gets jobs by ID, in the same order; `null` for IDs without a job.
   */
  async getJobs(
    ids: readonly string[],
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<(BackfillJobState | null)[]> {
    if (ids.length === 0) {
      return []
    }

    const [jobs, locks] = await Promise.all([
      this.#redis.mget<(BackfillJob | null)[]>(...ids.map(jobKey)),
      this.#redis.mget<(unknown | null)[]>(...ids.map(lockKey)),
    ])

    return ids.map((_, index) => {
      const job = jobs[index]

      return job
        ? { active: isActive(job, locks[index] != null, now), job }
        : null
    })
  }

  /**
   * Queues a job for an account, unless one is queued or being read already.
   *
   * A job that failed or was interrupted resumes where it stopped; a job that
   * is done starts over from the newest videos.
   */
  async enqueue(
    { accountId, provider, requestedBy, runId, talentId }: BackfillRequest,
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<EnqueueResult> {
    const id = getBackfillJobId(provider, accountId)
    const [current] = await this.getJobs([id], now)

    if (current?.active) {
      return { enqueued: false, job: current.job }
    }

    const resumed =
      current && current.job.status !== 'done' ? current.job : null
    const timestamp = now.toString()
    const job: BackfillJob = {
      accountId,
      added: resumed?.added ?? 0,
      attempts: 0,
      cursor: resumed?.cursor ?? null,
      error: null,
      finishedAt: null,
      id,
      pages: resumed?.pages ?? 0,
      provider,
      requestedAt: timestamp,
      requestedBy,
      runId: runId === undefined ? (resumed?.runId ?? null) : runId,
      startedAt: null,
      status: 'pending',
      talentId,
      updatedAt: timestamp,
    }

    // Jobs are stored as their JSON, so the job as read serializes back to
    // the exact value in Redis.
    const queued = await this.#redis.eval<[string, string, number, string]>(
      ENQUEUE_SCRIPT,
      [jobKey(id), REDIS_KEYS.VIDEO_BACKFILL_QUEUE, lockKey(id)],
      [
        current ? JSON.stringify(current.job) : '',
        JSON.stringify(job),
        BACKFILL_JOB_TTL_SECONDS,
        id,
      ],
    )

    if (queued !== 1) {
      const [latest] = await this.getJobs([id], now)

      return { enqueued: false, job: latest?.job ?? null }
    }

    return { enqueued: true, job }
  }

  /**
   * Takes the next job off the queue, locks it and marks it `running`.
   *
   * @returns `null` when the queue is empty.
   */
  async claim(
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<BackfillJob | null> {
    while (true) {
      const id = await this.#redis.rpop<string>(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)

      if (!id) {
        return null
      }

      const locked = await this.#redis.set(lockKey(id), now.toString(), {
        ex: BACKFILL_LEASE_SECONDS,
        nx: true,
      })

      if (locked !== 'OK') {
        // Queued twice: the worker that holds it queues it again if needed.
        continue
      }

      const job = await this.#redis.get<BackfillJob>(jobKey(id))

      if (!job || job.status === 'done' || job.status === 'failed') {
        await this.#redis.del(lockKey(id))
        continue
      }

      const timestamp = now.toString()
      const running: BackfillJob = {
        ...job,
        startedAt: job.startedAt ?? timestamp,
        status: 'running',
        updatedAt: timestamp,
      }

      await this.#save(running)

      return running
    }
  }

  /**
   * Records the progress of a claimed job.
   */
  async update(
    job: BackfillJob,
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<BackfillJob> {
    const updated: BackfillJob = { ...job, updatedAt: now.toString() }

    await this.#save(updated)

    return updated
  }

  /**
   * Marks a claimed job `done` and releases it.
   */
  async complete(
    job: BackfillJob,
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<BackfillJob> {
    return this.#finish({ ...job, error: null, status: 'done' }, now)
  }

  /**
   * Marks a claimed job `failed` and releases it.
   */
  async fail(
    job: BackfillJob,
    error: string,
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<BackfillJob> {
    return this.#finish({ ...job, error, status: 'failed' }, now)
  }

  /**
   * Puts a claimed job back at the end of the queue, to continue in a later
   * run, and releases it.
   */
  async requeue(
    job: BackfillJob,
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<BackfillJob> {
    const pending: BackfillJob = {
      ...job,
      status: 'pending',
      updatedAt: now.toString(),
    }

    await this.#queue(pending)

    return pending
  }

  async #finish(job: BackfillJob, now: Temporal.Instant): Promise<BackfillJob> {
    const timestamp = now.toString()
    const finished: BackfillJob = {
      ...job,
      finishedAt: timestamp,
      updatedAt: timestamp,
    }

    const transaction = this.#redis
      .multi()
      .set(jobKey(job.id), finished, { ex: BACKFILL_JOB_TTL_SECONDS })

    if (finished.runId) {
      transaction.set(getRunResultKey(finished.runId, job.id), finished, {
        ex: BACKFILL_JOB_TTL_SECONDS,
      })
    }

    await transaction.del(lockKey(job.id)).exec()

    return finished
  }

  async #queue(job: BackfillJob): Promise<void> {
    await this.#redis.eval<[string, string, number]>(
      REQUEUE_SCRIPT,
      [REDIS_KEYS.VIDEO_BACKFILL_QUEUE, jobKey(job.id), lockKey(job.id)],
      [job.id, JSON.stringify(job), BACKFILL_JOB_TTL_SECONDS],
    )
  }

  async #save(job: BackfillJob): Promise<void> {
    await this.#redis.set(jobKey(job.id), job, {
      ex: BACKFILL_JOB_TTL_SECONDS,
    })
  }
}
