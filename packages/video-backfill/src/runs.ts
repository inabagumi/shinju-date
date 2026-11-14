import { REDIS_KEYS } from '@shinju-date/constants'
import type { Redis } from '@upstash/redis'
import { Temporal } from 'temporal-polyfill'
import {
  BACKFILL_JOB_TTL_SECONDS,
  type BackfillJob,
  type BackfillJobStatus,
  type BackfillProvider,
  BackfillQueue,
  type BackfillRequest,
  getRunResultKey,
} from './queue.js'

/**
 * How long a request for a check holds the lock that keeps a second one from
 * starting at the same moment. Longer than a request may take; a request
 * that died holds it until it runs out.
 */
export const BACKFILL_RUN_LOCK_SECONDS = 5 * 60

/** Accounts queued at the same time when a check is requested. */
const ENQUEUE_CONCURRENCY = 10

/** A job of a check, as it was queued. */
export interface BackfillRunJob {
  accountId: string
  /**
   * Videos the job had saved before the check, when it resumed a job that
   * failed or was interrupted; not counted as added by the check.
   */
  addedBefore: number
  id: string
  provider: BackfillProvider
  talentId: string
}

/**
 * A request to check the accounts of all active talents for videos that are
 * not saved: the parent of one job per account.
 */
export interface BackfillRun {
  /** Accounts that could not be queued because of an error. */
  failed: number
  id: string
  /** Jobs the check queued. */
  jobs: BackfillRunJob[]
  requestedAt: string
  /** ID of the admin user who requested the check. */
  requestedBy: string | null
  /** Accounts left out because a job for them was queued or being read. */
  skipped: number
}

/**
 * Status of a job of a check. `interrupted` is a job that stopped without
 * finishing (e.g. its worker timed out, or it was lost) and can be requested
 * again to resume.
 */
export type BackfillRunJobStatus = BackfillJobStatus | 'interrupted'

export interface BackfillRunJobProgress extends BackfillRunJob {
  /** Whether the job is queued or being read. */
  active: boolean
  /** Videos saved since the check queued the job. */
  added: number
  error: string | null
  status: BackfillRunJobStatus
  updatedAt: string | null
}

export interface BackfillRunProgress {
  /** Whether any job of the check is queued or being read. */
  active: boolean
  /** Videos saved by the check, across all jobs. */
  added: number
  counts: Record<BackfillRunJobStatus, number>
  jobs: BackfillRunJobProgress[]
  run: BackfillRun
}

/** An account to check, without who requested it. */
export type BackfillRunRequest = Omit<BackfillRequest, 'requestedBy' | 'runId'>

export interface StartBackfillRunOptions {
  /** Called for each account that could not be queued. */
  onError?: (request: BackfillRunRequest, error: unknown) => void
  requestedBy: string | null
}

export type StartBackfillRunResult =
  | {
      /** Accounts that could not be queued because of an error. */
      failed: number
      run: BackfillRun
      /** Accounts left out because a job for them was queued or being read. */
      skipped: number
      status: 'started'
    }
  /** The latest check is still in progress. */
  | { progress: BackfillRunProgress; status: 'active' }
  /** Another request for a check is being handled at the same moment. */
  | { status: 'busy' }
  /** No account was queued: every one was skipped or failed. */
  | { failed: number; skipped: number; status: 'empty' }

function createCounts(): Record<BackfillRunJobStatus, number> {
  return { done: 0, failed: 0, interrupted: 0, pending: 0, running: 0 }
}

function toProgress(
  runJob: BackfillRunJob,
  job: BackfillJob,
  active: boolean,
): BackfillRunJobProgress {
  return {
    ...runJob,
    active,
    added: Math.max(0, job.added - runJob.addedBefore),
    error: job.error,
    status:
      !active && (job.status === 'pending' || job.status === 'running')
        ? 'interrupted'
        : job.status,
    updatedAt: job.updatedAt,
  }
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  callback: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0

  const work = async () => {
    while (next < items.length) {
      const index = next++

      results[index] = await callback(items[index] as T)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, work),
  )

  return results
}

/**
 * Checks of the accounts of all active talents for videos that are not
 * saved. A check queues one job per account in the {@link BackfillQueue},
 * tagged with the check's ID, and its progress is read from those jobs.
 *
 * Only the latest check is kept. A new one cannot start while it is in
 * progress, nor while another request for one is being handled.
 */
export class BackfillRuns {
  readonly #queue: BackfillQueue
  readonly #redis: Redis

  constructor(redis: Redis, queue: BackfillQueue = new BackfillQueue(redis)) {
    this.#queue = queue
    this.#redis = redis
  }

  /**
   * Gets the latest check with the progress of its jobs.
   *
   * @returns `null` when there was no check (or it was long ago).
   */
  async getLatest(
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<BackfillRunProgress | null> {
    const run = await this.#redis.get<BackfillRun>(
      REDIS_KEYS.VIDEO_BACKFILL_RUN,
    )

    return run ? this.getProgress(run, now) : null
  }

  /**
   * Reads the progress of the jobs of a check.
   *
   * A job that is requested again on its own while it is unfinished keeps
   * belonging to the check, so the check follows it; one that finished is
   * shown as it finished for the check, even if it was requested again
   * afterwards.
   */
  async getProgress(
    run: BackfillRun,
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<BackfillRunProgress> {
    const ids = run.jobs.map((job) => job.id)
    const [states, outcomes] = await Promise.all([
      this.#queue.getJobs(ids, now),
      ids.length > 0
        ? this.#redis.mget<(BackfillJob | null)[]>(
            ...ids.map((id) => getRunResultKey(run.id, id)),
          )
        : Promise.resolve([]),
    ])
    const counts = createCounts()
    let added = 0

    const jobs = run.jobs.map((runJob, index): BackfillRunJobProgress => {
      const state = states[index]
      const outcome = outcomes[index]
      const progress =
        state && state.job.runId === run.id
          ? toProgress(runJob, state.job, state.active)
          : outcome
            ? toProgress(runJob, outcome, false)
            : // Gone without an outcome, e.g. expired.
              {
                ...runJob,
                active: false,
                added: 0,
                error: null,
                status: 'interrupted' as const,
                updatedAt: null,
              }

      counts[progress.status]++
      added += progress.added

      return progress
    })

    return {
      active: jobs.some((job) => job.active),
      added,
      counts,
      jobs,
      run,
    }
  }

  /**
   * Requests a check of the given accounts: queues a job for each one that
   * is not queued or being read already, and saves the check as the latest.
   *
   * Jobs that failed or were interrupted resume where they stopped; jobs that
   * are done start over from the newest videos.
   */
  async start(
    requests: readonly BackfillRunRequest[],
    { onError, requestedBy }: StartBackfillRunOptions,
    now: Temporal.Instant = Temporal.Now.instant(),
  ): Promise<StartBackfillRunResult> {
    const token = crypto.randomUUID()
    const locked = await this.#redis.set(
      REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK,
      token,
      { ex: BACKFILL_RUN_LOCK_SECONDS, nx: true },
    )

    if (locked !== 'OK') {
      return { status: 'busy' }
    }

    try {
      const latest = await this.getLatest(now)

      if (latest?.active) {
        return { progress: latest, status: 'active' }
      }

      const runId = crypto.randomUUID()
      const outcomes = await mapWithConcurrency(
        requests,
        ENQUEUE_CONCURRENCY,
        async (request): Promise<BackfillRunJob | 'failed' | 'skipped'> => {
          try {
            const result = await this.#queue.enqueue(
              { ...request, requestedBy, runId },
              now,
            )

            if (!result.enqueued) {
              return 'skipped'
            }

            return {
              accountId: request.accountId,
              addedBefore: result.job.added,
              id: result.job.id,
              provider: request.provider,
              talentId: request.talentId,
            }
          } catch (error) {
            onError?.(request, error)

            return 'failed'
          }
        },
      )
      const jobs = outcomes.filter(
        (outcome): outcome is BackfillRunJob => typeof outcome === 'object',
      )
      const failed = outcomes.filter((outcome) => outcome === 'failed').length
      const skipped = outcomes.filter((outcome) => outcome === 'skipped').length

      if (jobs.length === 0) {
        return { failed, skipped, status: 'empty' }
      }

      const run: BackfillRun = {
        failed,
        id: runId,
        jobs,
        requestedAt: now.toString(),
        requestedBy,
        skipped,
      }

      await this.#redis.set(REDIS_KEYS.VIDEO_BACKFILL_RUN, run, {
        ex: BACKFILL_JOB_TTL_SECONDS,
      })

      return { failed, run, skipped, status: 'started' }
    } finally {
      await this.#unlock(token)
    }
  }

  /**
   * Releases the lock if it is still ours: it may have run out and been
   * taken by another request in the meantime. A lock that cannot be released
   * runs out by itself, so failing to release it does not fail the request.
   */
  async #unlock(token: string): Promise<void> {
    try {
      const holder = await this.#redis.get<string>(
        REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK,
      )

      if (holder === token) {
        await this.#redis.del(REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK)
      }
    } catch {
      // Runs out after BACKFILL_RUN_LOCK_SECONDS.
    }
  }
}
