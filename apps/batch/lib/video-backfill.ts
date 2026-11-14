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
  /** Pages are read until this time; the page in progress is finished. */
  deadline: Temporal.Instant
  getScraper: (provider: BackfillProvider) => Scraper
  queue: BackfillQueue
}

export interface BackfillRunResult {
  /** Videos saved during the run, across all jobs. */
  added: number
  /** Jobs that were worked on. */
  jobs: number
}

function isBeforeDeadline(deadline: Temporal.Instant): boolean {
  return Temporal.Instant.compare(Temporal.Now.instant(), deadline) < 0
}

/**
 * Reads pages of a claimed job until its history ends or the deadline
 * passes, then completes, requeues or fails it.
 *
 * @returns The number of videos saved.
 */
async function workOnJob(
  queue: BackfillQueue,
  scraper: Scraper,
  claimed: BackfillJob,
  deadline: Temporal.Instant,
): Promise<number> {
  let job = claimed
  let added = 0

  while (true) {
    let result: Awaited<ReturnType<Scraper['addPastVideos']>>

    try {
      result = await scraper.addPastVideos({
        accountId: job.accountId,
        cursor: job.cursor,
        now: Temporal.Now.instant(),
      })
    } catch (error) {
      const attempts = job.attempts + 1
      const message = error instanceof Error ? error.message : String(error)
      const context = { attempts, jobId: job.id, talentId: job.talentId }

      Sentry.captureException(error, { extra: context })

      // A missing account will not come back by retrying.
      if (
        error instanceof AccountNotFoundError ||
        attempts >= BACKFILL_MAX_ATTEMPTS
      ) {
        logger.error('過去動画の取り込みを中止しました', {
          ...context,
          error: message,
        })
        await queue.fail({ ...job, attempts }, message)
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
      await queue.complete(job)

      return added
    }

    if (!isBeforeDeadline(deadline)) {
      await queue.requeue(job)

      return added
    }

    job = await queue.update(job)
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
  deadline,
  getScraper,
  queue,
}: WorkOffBackfillQueueOptions): Promise<BackfillRunResult> {
  const seen = new Set<string>()
  let added = 0

  while (isBeforeDeadline(deadline)) {
    const job = await queue.claim()

    if (!job) {
      break
    }

    if (seen.has(job.id)) {
      await queue.requeue(job)
      break
    }

    seen.add(job.id)
    added += await workOnJob(queue, getScraper(job.provider), job, deadline)
  }

  return { added, jobs: seen.size }
}
