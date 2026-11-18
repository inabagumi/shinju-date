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

/**
 * How a job moves between statuses: for each operation, the statuses it
 * moves a job from, and the status it moves it to. Every write of
 * {@link BackfillQueue} follows it, and throws a
 * {@link BackfillTransitionError} for a job whose status is not among the
 * operation's `from`: e.g. a job that finished cannot make progress or be
 * put back by a worker, only be requested again.
 */
export const BACKFILL_JOB_TRANSITIONS = {
  /**
   * A worker takes a job off the queue. `running` when it was queued twice
   * and the lease of the first claim ran out. {@link CLAIM_SCRIPT} skips the
   * queue entries of other jobs.
   */
  claim: { from: ['pending', 'running'], to: 'running' },
  /** A worker read the last page of a claimed job. */
  complete: { from: ['running'], to: 'done' },
  /**
   * An admin requests a job that is not queued or being read ({@link
   * getJobActivity}): one that finished, or that was interrupted.
   */
  enqueue: { from: ['done', 'failed', 'pending', 'running'], to: 'pending' },
  /** A worker gives up a claimed job. */
  fail: { from: ['running'], to: 'failed' },
  /** A worker read a page of a claimed job, and keeps it. */
  recordPage: { from: ['running'], to: 'running' },
  /** A worker puts a claimed job back, to continue or to retry later. */
  requeue: { from: ['running'], to: 'pending' },
} as const satisfies Record<
  string,
  { from: readonly BackfillJobStatus[]; to: BackfillJobStatus }
>

export type BackfillJobOperation = keyof typeof BACKFILL_JOB_TRANSITIONS

/**
 * Thrown for an operation on a job whose status it does not move from, as
 * {@link BACKFILL_JOB_TRANSITIONS} says.
 */
export class BackfillTransitionError extends Error {
  override name = 'BackfillTransitionError'
  readonly jobId: string
  readonly operation: BackfillJobOperation
  readonly status: BackfillJobStatus

  constructor(
    jobId: string,
    operation: BackfillJobOperation,
    status: BackfillJobStatus,
  ) {
    super(
      `A backfill job that is ${status} cannot move to ${BACKFILL_JOB_TRANSITIONS[operation].to} (${operation}): ${jobId}`,
    )
    this.jobId = jobId
    this.operation = operation
    this.status = status
  }
}

/** Tells whether an operation may move a job that has the given status. */
export function canTransition(
  operation: BackfillJobOperation,
  status: BackfillJobStatus,
): boolean {
  const { from }: { from: readonly BackfillJobStatus[] } =
    BACKFILL_JOB_TRANSITIONS[operation]

  return from.includes(status)
}

/**
 * Moves a job by an operation.
 *
 * @throws {BackfillTransitionError} When the operation does not move a job
 *   that has its status.
 */
function transition<T extends BackfillJob>(
  job: T,
  operation: BackfillJobOperation,
): T {
  if (!canTransition(operation, job.status)) {
    throw new BackfillTransitionError(job.id, operation, job.status)
  }

  return { ...job, status: BACKFILL_JOB_TRANSITIONS[operation].to }
}

/**
 * Status of a job as it is shown to admins. `interrupted` is a job that is
 * `pending` or `running` but neither queued nor being read: it stopped
 * without finishing (e.g. its worker timed out, or it was lost) and can be
 * requested again to resume.
 */
export type BackfillActivityStatus = BackfillJobStatus | 'interrupted'

export interface BackfillJobActivity {
  /**
   * Whether the job is queued or being read. An active job cannot be
   * requested again; one that is interrupted can.
   */
  active: boolean
  status: BackfillActivityStatus
}

export interface BackfillJobState extends BackfillJobActivity {
  job: BackfillJob
}

export interface GetJobActivityOptions {
  /** Whether a worker holds the lock of the job. */
  locked: boolean
  /** Current time (default: the system clock). */
  now?: Temporal.Instant
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

/** Runs in a row that may fail before a job is given up, by default. */
export const BACKFILL_MAX_ATTEMPTS = 3

/**
 * How long a worker may run, by default, in seconds. The lease of a claim
 * is made from it ({@link BackfillQueueOptions.maxRunSeconds}).
 */
export const BACKFILL_DEFAULT_MAX_RUN_SECONDS = 5 * 60

/**
 * Time added to the longest a worker may run to make the lease of a claim,
 * for the time a claim takes to reach Redis and clocks that differ.
 */
export const BACKFILL_LEASE_MARGIN_SECONDS = 60

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

/**
 * Tells whether a job is queued or being read, and how it is shown to
 * admins: a `pending` job is queued until it waited
 * {@link BACKFILL_PENDING_TIMEOUT_SECONDS}, and a `running` one is being
 * read while its worker holds the lock; otherwise it is `interrupted`.
 */
export function getJobActivity(
  job: Pick<BackfillJob, 'status' | 'updatedAt'>,
  { locked, now = Temporal.Now.instant() }: GetJobActivityOptions,
): BackfillJobActivity {
  let active: boolean

  switch (job.status) {
    case 'pending':
      active =
        Temporal.Instant.compare(
          Temporal.Instant.from(job.updatedAt).add({
            seconds: BACKFILL_PENDING_TIMEOUT_SECONDS,
          }),
          now,
        ) > 0
      break
    case 'running':
      active = locked
      break
    default:
      return { active: false, status: job.status }
  }

  return { active, status: active ? job.status : 'interrupted' }
}

export interface BackfillQueueOptions {
  /**
   * Runs in a row that may fail before a job is given up (default:
   * {@link BACKFILL_MAX_ATTEMPTS}).
   */
  maxAttempts?: number
  /**
   * The longest a worker may run, in seconds, such as the `maxDuration` of
   * the route that works off the queue (default:
   * {@link BACKFILL_DEFAULT_MAX_RUN_SECONDS}). A claim is locked for this
   * plus {@link BACKFILL_LEASE_MARGIN_SECONDS}, so that a job is never read
   * by two workers at once; a job whose worker died is free again once the
   * lock runs out.
   */
  maxRunSeconds?: number
}

/** The result of reading one page of a claimed job. */
export interface BackfillPage {
  /** Videos saved from the page. */
  added: number
  /** Whether the history ended with the page; the job is then done. */
  done: boolean
  /** Where reading continues. */
  nextCursor: string | null
}

export interface BackfillFailureOptions {
  /**
   * Whether retrying cannot help (e.g. the account is gone), so that the job
   * is given up at once.
   */
  permanent?: boolean
}

/**
 * Queue of backfill jobs in Redis, one job per platform account.
 *
 * The admin app requests jobs ({@link enqueue}) and shows their progress
 * ({@link getJobs}); the batch app works them off a page at a time:
 * {@link claim} a job, read pages and record each one ({@link recordPage})
 * while its time lasts, then {@link requeue} it to continue in a later run.
 * A page that cannot be read is recorded with {@link recordFailure}, which
 * retries the job in a later run or gives it up. Jobs are read in turns, so
 * one long history does not hold up the others.
 *
 * Every write follows {@link BACKFILL_JOB_TRANSITIONS}, and the fields of a
 * job are changed only here.
 *
 * A claimed job is locked for {@link leaseSeconds}, so it is never read
 * twice at once even if it was queued twice. The lock holds a token made for
 * the claim ({@link BackfillClaim}), and the writes of a worker are made only
 * while it does: once the lease runs out and another worker claims the job,
 * the first worker's writes are ignored and return `lost`.
 */
export class BackfillQueue {
  /** How long a claim is locked, in seconds. */
  readonly leaseSeconds: number
  /** Runs in a row that may fail before a job is given up. */
  readonly maxAttempts: number
  readonly #redis: Redis

  constructor(
    redis: Redis,
    {
      maxAttempts = BACKFILL_MAX_ATTEMPTS,
      maxRunSeconds = BACKFILL_DEFAULT_MAX_RUN_SECONDS,
    }: BackfillQueueOptions = {},
  ) {
    this.leaseSeconds = Math.ceil(maxRunSeconds) + BACKFILL_LEASE_MARGIN_SECONDS
    this.maxAttempts = maxAttempts
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
        ? {
            ...getJobActivity(job, { locked: locks[index] != null, now }),
            job,
          }
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

    if (current) {
      transition(current.job, 'enqueue')
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
      [token, this.leaseSeconds, now.toString(), BACKFILL_JOB_TTL_SECONDS],
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
   * Records a page of a claimed job that was read: adds its videos and pages
   * to the progress, moves the cursor on and clears the failures. When the
   * history ended with it, the job is done and released; otherwise it stays
   * claimed, to read the next page or to {@link requeue} it.
   *
   * When the progress cannot be saved, the job is put back in the queue with
   * it if possible, so that it does not wait until it is requested again,
   * and the error is thrown.
   */
  async recordPage(
    { job, token }: BackfillClaim,
    { added, done, nextCursor }: BackfillPage,
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<BackfillWriteResult> {
    const progressed: BackfillJob = {
      ...job,
      added: job.added + added,
      attempts: 0,
      cursor: nextCursor,
      error: null,
      pages: job.pages + 1,
    }

    if (done) {
      return this.#finish(progressed, 'complete', token, now)
    }

    try {
      return await this.#save(progressed, token, now)
    } catch (error) {
      try {
        await this.requeue({ job: progressed, token }, now)
      } catch {
        // The job stays claimed until its lease runs out; the error that
        // stopped the save is the one to report.
      }

      throw error
    }
  }

  /**
   * Records a page of a claimed job that could not be read: counts the
   * attempt and keeps the error. The job is given up (`failed`) when the
   * error is permanent or the attempts reached {@link maxAttempts}, and put
   * back in the queue to retry in a later run otherwise. Either way it is
   * released.
   */
  async recordFailure(
    { job, token }: BackfillClaim,
    error: unknown,
    { permanent = false }: BackfillFailureOptions = {},
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<BackfillWriteResult> {
    const attempts = job.attempts + 1
    const failed: BackfillJob = {
      ...job,
      attempts,
      error: error instanceof Error ? error.message : String(error),
    }

    return permanent || attempts >= this.maxAttempts
      ? this.#finish(failed, 'fail', token, now)
      : this.requeue({ job: failed, token }, now)
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
      ...transition(job, 'requeue'),
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

  async #save(
    job: BackfillJob,
    token: string,
    now: Temporal.Instant,
  ): Promise<BackfillWriteResult> {
    const updated: BackfillJob = {
      ...transition(job, 'recordPage'),
      updatedAt: now.toString(),
    }
    const saved = await this.#redis.eval<[string, string, number], number>(
      SAVE_SCRIPT,
      [jobKey(job.id), lockKey(job.id)],
      [token, JSON.stringify(updated), BACKFILL_JOB_TTL_SECONDS],
    )

    return saved === 1 ? { job: updated, status: 'saved' } : { status: 'lost' }
  }

  /** Saves a claimed job as `done` or `failed` and releases it. */
  async #finish(
    job: BackfillJob,
    operation: 'complete' | 'fail',
    token: string,
    now: Temporal.Instant,
  ): Promise<BackfillWriteResult> {
    const timestamp = now.toString()
    const finished: BackfillJob = {
      ...transition(job, operation),
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
