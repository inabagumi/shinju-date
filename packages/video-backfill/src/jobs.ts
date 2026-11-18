import { BACKFILL_PENDING_TIMEOUT_SECONDS, getBackfillJobId } from './keys.js'
import type {
  BackfillJob,
  BackfillJobActivity,
  BackfillJobStatus,
  BackfillPage,
  BackfillRequest,
  GetJobActivityOptions,
} from './types.js'

/** Runs in a row that may fail before a job is given up, by default. */
export const BACKFILL_MAX_ATTEMPTS = 3

/**
 * How a job moves between statuses: for each operation, the statuses it
 * moves a job from, and the status it moves it to. Every write of
 * `BackfillQueue` follows it, and throws a {@link BackfillTransitionError}
 * for a job whose status is not among the operation's `from`: e.g. a job
 * that finished cannot make progress or be put back by a worker, only be
 * requested again.
 */
export const BACKFILL_JOB_TRANSITIONS = {
  /**
   * A worker takes a job off the queue. `running` when it was queued twice
   * and the lease of the first claim ran out. `CLAIM_SCRIPT` skips the
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
export function transition<T extends BackfillJob>(
  job: T,
  operation: BackfillJobOperation,
): T {
  if (!canTransition(operation, job.status)) {
    throw new BackfillTransitionError(job.id, operation, job.status)
  }

  return { ...job, status: BACKFILL_JOB_TRANSITIONS[operation].to }
}

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

/**
 * The job that a request queues, given the job for the account as it is
 * (`null` when there is none). A job that failed or was interrupted resumes
 * where it stopped; a job that is done starts over from the newest videos.
 *
 * @throws {BackfillTransitionError} When the job cannot be requested again.
 */
export function createRequestedJob(
  { accountId, provider, requestedBy, runId, talentId }: BackfillRequest,
  current: BackfillJob | null,
  now: Temporal.Instant,
): BackfillJob {
  if (current) {
    transition(current, 'enqueue')
  }

  const resumed = current && current.status !== 'done' ? current : null
  const timestamp = now.toString()

  return {
    accountId,
    added: resumed?.added ?? 0,
    attempts: 0,
    cursor: resumed?.cursor ?? null,
    error: null,
    finishedAt: null,
    id: getBackfillJobId(provider, accountId),
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
}

/**
 * Moves a job by an operation of a worker, at a time: as
 * {@link transition}, and with the time it changed (and finished, for an
 * operation that finishes it).
 *
 * @throws {BackfillTransitionError} When the operation does not move a job
 *   that has its status.
 */
export function moveJob(
  job: BackfillJob,
  operation: Exclude<BackfillJobOperation, 'claim' | 'enqueue'>,
  now: Temporal.Instant,
): BackfillJob {
  const timestamp = now.toString()
  const moved = { ...transition(job, operation), updatedAt: timestamp }

  return operation === 'complete' || operation === 'fail'
    ? { ...moved, finishedAt: timestamp }
    : moved
}

/**
 * A job with a page that was read: its videos and the page added to the
 * progress, the cursor moved on and the failures cleared.
 */
export function withPage(
  job: BackfillJob,
  { added, nextCursor }: BackfillPage,
): BackfillJob {
  return {
    ...job,
    added: job.added + added,
    attempts: 0,
    cursor: nextCursor,
    error: null,
    pages: job.pages + 1,
  }
}

/** A job with a page that could not be read: the attempt and its error. */
export function withFailure(job: BackfillJob, error: unknown): BackfillJob {
  return {
    ...job,
    attempts: job.attempts + 1,
    error: error instanceof Error ? error.message : String(error),
  }
}
