import { REDIS_KEYS } from '@shinju-date/constants'
import type { Enums } from '@shinju-date/database'
import type { Redis } from '@upstash/redis'

/** Platform whose account a job reads, as in `videos.platform`. */
export type BackfillProvider = Enums<'platform_type'>

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

/**
 * A job a worker claimed, with the token of its lock. The worker passes it to
 * every write, which is made only while the lock still holds the token.
 */
export interface BackfillClaim {
  job: BackfillJob
  /** The value of the lock, made anew for each claim. */
  token: string
}

export type BackfillWriteResult =
  | { job: BackfillJob; status: 'saved' }
  /**
   * The lock no longer holds the claim's token: its lease ran out, and another
   * worker may have claimed the job since. Nothing was written; the worker
   * should stop working on the job.
   */
  | { status: 'lost' }

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
 * Takes the next job off the queue, locks it and saves it as `running`, all
 * at once, so that a worker that stops in between never leaves a job off the
 * queue but still `pending`.
 *
 * Queue entries of jobs that are locked by another worker (queued twice) are
 * dropped: that worker queues the job again if needed. Entries of jobs that
 * are finished or gone are dropped too.
 *
 * The job is decoded and encoded again with `cjson`, which escapes `/` as
 * `\/`; that is undone, so that the job is stored as `JSON.stringify` writes
 * it and {@link ENQUEUE_SCRIPT} finds it unchanged. In the output of `cjson`,
 * every `/` is escaped, so a `\/` is always an escaped `/`.
 *
 * KEYS: queue, prefix of job keys, prefix of lock keys (the keys of a job are
 * the prefixes followed by its ID, which is only known once it is taken off
 * the queue)
 * ARGV: lock token, lease, timestamp, TTL
 *
 * @returns The job as saved (JSON), or nil when the queue is empty.
 */
export const CLAIM_SCRIPT = `-- video-backfill:claim
while true do
  local id = redis.call('RPOP', KEYS[1])
  if not id then return false end
  local lock = KEYS[3] .. id
  if redis.call('SET', lock, ARGV[1], 'EX', ARGV[2], 'NX') then
    local key = KEYS[2] .. id
    local value = redis.call('GET', key)
    local job = value and cjson.decode(value)
    if job and job.status ~= 'done' and job.status ~= 'failed' then
      job.status = 'running'
      if job.startedAt == nil or job.startedAt == cjson.null then
        job.startedAt = ARGV[3]
      end
      job.updatedAt = ARGV[3]
      local encoded = string.gsub(cjson.encode(job), [[\\/]], '/')
      redis.call('SET', key, encoded, 'EX', ARGV[4])
      return encoded
    end
    redis.call('DEL', lock)
  end
end`

/**
 * Saves a claimed job, only while its lock holds the claim's token.
 *
 * KEYS: job, worker lock
 * ARGV: lock token, job, TTL
 *
 * @returns 1 when the job was saved, 0 when the lock was lost.
 */
export const SAVE_SCRIPT = `-- video-backfill:save
if redis.call('GET', KEYS[2]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1`

/**
 * Saves a claimed job that finished, with its outcome for the check it
 * belongs to if any, and releases it, only while its lock holds the claim's
 * token.
 *
 * KEYS: job, worker lock, outcome for the check (absent without a check)
 * ARGV: lock token, job, TTL
 *
 * @returns 1 when the job was saved, 0 when the lock was lost.
 */
export const FINISH_SCRIPT = `-- video-backfill:finish
if redis.call('GET', KEYS[2]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
if KEYS[3] then
  redis.call('SET', KEYS[3], ARGV[2], 'EX', ARGV[3])
end
redis.call('DEL', KEYS[2])
return 1`

/**
 * Puts a claimed job back at the end of the queue, saves it as pending and
 * releases it, atomically so a worker can claim it right away, and only while
 * its lock holds the claim's token.
 *
 * `LPUSH` is the only write here that can fail (on a key of the wrong
 * type), and a script stops at a failing command without rolling back the
 * ones before it, so it runs first: when it fails nothing changed and the job
 * stays claimed until its lease runs out. A MULTI transaction would not do:
 * it runs the remaining commands after a failing one, which would leave the
 * job pending without a queue entry.
 *
 * KEYS: queue, job, worker lock
 * ARGV: job ID, job, TTL, lock token
 *
 * @returns 1 when the job was queued, 0 when the lock was lost.
 */
export const REQUEUE_SCRIPT = `-- video-backfill:requeue
if redis.call('GET', KEYS[3]) ~= ARGV[4] then return 0 end
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
 * read twice at once even if it was queued twice. The lock holds a token made
 * for the claim ({@link BackfillClaim}), and the writes of a worker are made
 * only while it does: once the lease runs out and another worker claims the
 * job, the first worker's writes are ignored and return `lost`.
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
   * Takes the next job off the queue, locks it with a token of its own and
   * marks it `running`, in one call to Redis.
   *
   * @returns The job with the token to write it with, or `null` when the
   *   queue is empty.
   */
  async claim(
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<BackfillClaim | null> {
    const token = crypto.randomUUID()
    const reply = await this.#redis.eval<
      [string, number, string, number],
      BackfillJob | string | null
    >(
      CLAIM_SCRIPT,
      [
        REDIS_KEYS.VIDEO_BACKFILL_QUEUE,
        REDIS_KEYS.VIDEO_BACKFILL_JOB_PREFIX,
        REDIS_KEYS.VIDEO_BACKFILL_LOCK_PREFIX,
      ],
      [token, BACKFILL_LEASE_SECONDS, now.toString(), BACKFILL_JOB_TTL_SECONDS],
    )

    if (reply == null) {
      return null
    }

    // `@upstash/redis` parses the JSON of the reply unless it was created
    // without automatic deserialization.
    const job: BackfillJob =
      typeof reply === 'string' ? JSON.parse(reply) : reply

    return { job, token }
  }

  /**
   * Records the progress of a claimed job.
   */
  async update(
    { job, token }: BackfillClaim,
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<BackfillWriteResult> {
    const updated: BackfillJob = { ...job, updatedAt: now.toString() }
    const saved = await this.#redis.eval<[string, string, number], number>(
      SAVE_SCRIPT,
      [jobKey(job.id), lockKey(job.id)],
      [token, JSON.stringify(updated), BACKFILL_JOB_TTL_SECONDS],
    )

    return saved === 1 ? { job: updated, status: 'saved' } : { status: 'lost' }
  }

  /**
   * Marks a claimed job `done` and releases it.
   */
  async complete(
    { job, token }: BackfillClaim,
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<BackfillWriteResult> {
    return this.#finish({ ...job, error: null, status: 'done' }, token, now)
  }

  /**
   * Marks a claimed job `failed` and releases it.
   */
  async fail(
    { job, token }: BackfillClaim,
    error: string,
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<BackfillWriteResult> {
    return this.#finish({ ...job, error, status: 'failed' }, token, now)
  }

  /**
   * Puts a claimed job back at the end of the queue, to continue in a later
   * run, and releases it.
   */
  async requeue(
    { job, token }: BackfillClaim,
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<BackfillWriteResult> {
    const pending: BackfillJob = {
      ...job,
      status: 'pending',
      updatedAt: now.toString(),
    }
    const queued = await this.#redis.eval<
      [string, string, number, string],
      number
    >(
      REQUEUE_SCRIPT,
      [REDIS_KEYS.VIDEO_BACKFILL_QUEUE, jobKey(job.id), lockKey(job.id)],
      [job.id, JSON.stringify(pending), BACKFILL_JOB_TTL_SECONDS, token],
    )

    return queued === 1 ? { job: pending, status: 'saved' } : { status: 'lost' }
  }

  async #finish(
    job: BackfillJob,
    token: string,
    now: Temporal.Instant,
  ): Promise<BackfillWriteResult> {
    const timestamp = now.toString()
    const finished: BackfillJob = {
      ...job,
      finishedAt: timestamp,
      updatedAt: timestamp,
    }
    const keys = [jobKey(job.id), lockKey(job.id)]

    if (finished.runId) {
      keys.push(getRunResultKey(finished.runId, job.id))
    }

    const saved = await this.#redis.eval<[string, string, number], number>(
      FINISH_SCRIPT,
      keys,
      [token, JSON.stringify(finished), BACKFILL_JOB_TTL_SECONDS],
    )

    return saved === 1 ? { job: finished, status: 'saved' } : { status: 'lost' }
  }
}
