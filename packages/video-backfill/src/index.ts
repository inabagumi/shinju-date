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
  talentId: string
}

export type EnqueueResult =
  | { enqueued: true; job: BackfillJob }
  /** A job for the account is queued or being read already. */
  | { enqueued: false; job: BackfillJob }

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
    { accountId, provider, requestedBy, talentId }: BackfillRequest,
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
      startedAt: null,
      status: 'pending',
      talentId,
      updatedAt: timestamp,
    }

    await this.#save(job)
    await this.#push(id)

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

    await this.#save(pending)
    // Unlock first: a worker that takes it off the queue right away must be
    // able to claim it.
    await this.#redis.del(lockKey(job.id))
    await this.#push(job.id)

    return pending
  }

  async #finish(job: BackfillJob, now: Temporal.Instant): Promise<BackfillJob> {
    const timestamp = now.toString()
    const finished: BackfillJob = {
      ...job,
      finishedAt: timestamp,
      updatedAt: timestamp,
    }

    await this.#save(finished)
    await this.#redis.del(lockKey(job.id))

    return finished
  }

  async #push(id: string): Promise<void> {
    await this.#redis.lpush(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, id)
    await this.#redis.expire(
      REDIS_KEYS.VIDEO_BACKFILL_QUEUE,
      BACKFILL_JOB_TTL_SECONDS,
    )
  }

  async #save(job: BackfillJob): Promise<void> {
    await this.#redis.set(jobKey(job.id), job, {
      ex: BACKFILL_JOB_TTL_SECONDS,
    })
  }
}
