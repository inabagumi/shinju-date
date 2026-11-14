import * as Sentry from '@sentry/nextjs'
import { logger } from '@shinju-date/logger'
import { AccountNotFoundError, type Scraper } from '@shinju-date/scraper'
import type {
  BackfillJob,
  BackfillProvider,
  BackfillQueue,
} from '@shinju-date/video-backfill'
import { Temporal } from 'temporal-polyfill'

/** Runs in a row that may fail before a job is given up. */
export const BACKFILL_MAX_ATTEMPTS = 3

export interface WorkOffBackfillQueueOptions {
  /** Current time (default: the system clock); replaced in tests. */
  clock?: () => Temporal.Instant
  /** Pages are read until this time; the page in progress is finished. */
  deadline: Temporal.Instant
  getScraper: (provider: BackfillProvider) => Scraper
  /**
   * Called with each job that is completed or given up, e.g. to record it in
   * the history. A failure is reported and does not stop the run.
   */
  onFinish?: (job: BackfillJob) => Promise<void> | void
  queue: BackfillQueue
}

export interface BackfillRunResult {
  /** Videos saved during the run, across all jobs. */
  added: number
  /** Jobs that were worked on. */
  jobs: number
}

type Clock = () => Temporal.Instant

type OnFinish = NonNullable<WorkOffBackfillQueueOptions['onFinish']>

/**
 * Sentry tag set on the error that made a job give up, so that an alert can
 * notify of jobs that need to be requested again. Errors that are retried
 * carry `retrying` instead.
 */
export const BACKFILL_SENTRY_TAG = 'video_backfill'

const systemClock: Clock = () => Temporal.Now.instant()

function isBefore(clock: Clock, deadline: Temporal.Instant): boolean {
  return Temporal.Instant.compare(clock(), deadline) < 0
}

/**
 * Reads pages of a claimed job until its history ends or the deadline
 * passes, then completes, requeues or fails it.
 *
 * @returns The number of videos saved.
 */
async function reportFinished(
  onFinish: OnFinish | undefined,
  job: BackfillJob,
): Promise<void> {
  if (!onFinish) {
    return
  }

  try {
    await onFinish(job)
  } catch (error) {
    Sentry.captureException(error, {
      extra: { jobId: job.id, status: job.status, talentId: job.talentId },
    })
    logger.error('過去動画の取り込みの結果を記録できませんでした', {
      error,
      jobId: job.id,
      status: job.status,
    })
  }
}

async function workOnJob(
  queue: BackfillQueue,
  scraper: Scraper,
  claimed: BackfillJob,
  deadline: Temporal.Instant,
  clock: Clock,
  onFinish: OnFinish | undefined,
): Promise<number> {
  let job = claimed
  let added = 0

  while (true) {
    let result: Awaited<ReturnType<Scraper['addPastVideos']>>

    try {
      result = await scraper.addPastVideos({
        accountId: job.accountId,
        cursor: job.cursor,
        now: clock(),
      })
    } catch (error) {
      const attempts = job.attempts + 1
      const message = error instanceof Error ? error.message : String(error)
      const context = { attempts, jobId: job.id, talentId: job.talentId }
      // A missing account will not come back by retrying.
      const givingUp =
        error instanceof AccountNotFoundError ||
        attempts >= BACKFILL_MAX_ATTEMPTS

      Sentry.captureException(error, {
        extra: context,
        level: givingUp ? 'error' : 'warning',
        tags: {
          [BACKFILL_SENTRY_TAG]: givingUp ? 'failed' : 'retrying',
          provider: job.provider,
        },
      })

      if (givingUp) {
        logger.error('過去動画の取り込みを中止しました', {
          ...context,
          error: message,
        })
        await reportFinished(
          onFinish,
          await queue.fail({ ...job, attempts }, message),
        )
      } else {
        logger.warn('過去動画の取り込みに失敗したため後で再試行します', {
          ...context,
          error: message,
        })
        await queue.requeue({ ...job, attempts, error: message })
      }

      return added
    }

    added += result.added
    job = {
      ...job,
      added: job.added + result.added,
      attempts: 0,
      cursor: result.cursor,
      error: null,
      pages: job.pages + 1,
    }

    if (result.cursor === null) {
      logger.info('過去動画の取り込みが完了しました', {
        added: job.added,
        jobId: job.id,
        pages: job.pages,
        talentId: job.talentId,
      })
      await reportFinished(onFinish, await queue.complete(job))

      return added
    }

    if (!isBefore(clock, deadline)) {
      await queue.requeue(job)

      return added
    }

    try {
      job = await queue.update(job)
    } catch (error) {
      // The job is off the queue and marked running: put it back with the
      // progress made so far, or it would wait until it is requested again.
      try {
        await queue.requeue(job)
      } catch (requeueError) {
        logger.error('過去動画の取り込みを再キューできませんでした', {
          error: requeueError,
          jobId: job.id,
        })
      }

      throw error
    }
  }
}

/**
 * Works off the backfill queue until it is empty or the deadline passes.
 *
 * Every job is worked on at most once per run: one that comes around again
 * (it is the only one queued, or it failed and waits for a retry) is left for
 * the next run, so retries are spread over runs instead of happening in a
 * burst.
 */
export async function workOffBackfillQueue({
  clock = systemClock,
  deadline,
  getScraper,
  onFinish,
  queue,
}: WorkOffBackfillQueueOptions): Promise<BackfillRunResult> {
  const seen = new Set<string>()
  let added = 0

  while (isBefore(clock, deadline)) {
    const job = await queue.claim()

    if (!job) {
      break
    }

    if (seen.has(job.id)) {
      await queue.requeue(job)
      break
    }

    seen.add(job.id)
    added += await workOnJob(
      queue,
      getScraper(job.provider),
      job,
      deadline,
      clock,
      onFinish,
    )
  }

  return { added, jobs: seen.size }
}
