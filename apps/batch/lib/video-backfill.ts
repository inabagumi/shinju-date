import * as Sentry from "@sentry/nextjs";
import { logger } from "@shinju-date/logger";
import { AccountNotFoundError } from "@shinju-date/scraper";
import type { Scraper } from "@shinju-date/scraper";
import type {
  BackfillClaim,
  BackfillJob,
  BackfillProvider,
  BackfillQueue,
  BackfillWriteResult,
} from "@shinju-date/video-backfill";

export interface WorkOffBackfillQueueOptions {
  /** Current time (default: the system clock); replaced in tests. */
  clock?: () => Temporal.Instant;
  /** Pages are read until this time; the page in progress is finished. */
  deadline: Temporal.Instant;
  getScraper: (provider: BackfillProvider) => Scraper;
  /**
   * Called with each job that is completed or given up, e.g. to record it in
   * the history. A failure is reported and does not stop the run.
   */
  onFinish?: (job: BackfillJob) => Promise<void> | void;
  queue: BackfillQueue;
}

export interface BackfillRunResult {
  /** Videos saved during the run, across all jobs. */
  added: number;
  /** Jobs that were worked on. */
  jobs: number;
}

type Clock = () => Temporal.Instant;

type OnFinish = NonNullable<WorkOffBackfillQueueOptions["onFinish"]>;

/**
 * Sentry tag set on the error that made a job give up, so that an alert can
 * notify of jobs that need to be requested again. Errors that are retried
 * carry `retrying` instead.
 */
export const BACKFILL_SENTRY_TAG = "video_backfill";

const systemClock: Clock = () => Temporal.Now.instant();

const isBefore = (clock: Clock, deadline: Temporal.Instant): boolean =>
  Temporal.Instant.compare(clock(), deadline) < 0;

/**
 * Tells whether a write kept the job, and logs it when the lock was lost:
 * the lease ran out, so another worker may be reading the job, and this one
 * must stop working on it.
 */
const isSaved = (
  result: BackfillWriteResult,
  job: BackfillJob
): result is Extract<BackfillWriteResult, { status: "saved" }> => {
  if (result.status === "saved") {
    return true;
  }

  logger.warn(
    "過去動画の取り込みのロックが切れたため、このジョブの処理をやめます",
    { jobId: job.id, talentId: job.talentId }
  );

  return false;
};

/**
 * Reports a job that was completed or given up, unless its lock was lost.
 */
const reportFinished = async (
  onFinish: OnFinish | undefined,
  result: BackfillWriteResult,
  attempted: BackfillJob
): Promise<void> => {
  if (!isSaved(result, attempted) || !onFinish) {
    return;
  }

  const { job } = result;

  try {
    await onFinish(job);
  } catch (error) {
    Sentry.captureException(error, {
      extra: { jobId: job.id, status: job.status, talentId: job.talentId },
    });
    logger.error("過去動画の取り込みの結果を記録できませんでした", {
      error,
      jobId: job.id,
      status: job.status,
    });
  }
};

/**
 * Reports the error that stopped a page of a job, as the queue recorded it:
 * given up, retried in a later run, or not recorded at all (the lock was
 * lost, or the write failed), in which case the job is not given up here.
 */
const reportFailure = (
  error: unknown,
  job: BackfillJob,
  recorded: BackfillWriteResult | null
): void => {
  const saved = recorded?.status === "saved" ? recorded.job : null;
  const givingUp = saved?.status === "failed";
  const context = {
    attempts: saved?.attempts ?? null,
    jobId: job.id,
    talentId: job.talentId,
  };

  Sentry.captureException(error, {
    extra: context,
    level: givingUp ? "error" : "warning",
    tags: {
      [BACKFILL_SENTRY_TAG]: givingUp ? "failed" : "retrying",
      provider: job.provider,
    },
  });

  if (!saved) {
    return;
  }

  const message = error instanceof Error ? error.message : String(error);

  if (givingUp) {
    logger.error("過去動画の取り込みを中止しました", {
      ...context,
      error: message,
    });
  } else {
    logger.warn("過去動画の取り込みに失敗したため後で再試行します", {
      ...context,
      error: message,
    });
  }
};

/**
 * Records the error that stopped a page of a job; the queue decides whether
 * to retry the job or give it up.
 */
const recordFailure = async (
  queue: BackfillQueue,
  claim: BackfillClaim,
  error: unknown,
  onFinish: OnFinish | undefined
): Promise<void> => {
  let recorded: BackfillWriteResult;

  try {
    recorded = await queue.recordFailure(claim, error, {
      // A missing account will not come back by retrying.
      permanent: error instanceof AccountNotFoundError,
    });
  } catch (writeError) {
    reportFailure(error, claim.job, null);

    throw writeError;
  }

  reportFailure(error, claim.job, recorded);

  if (recorded.status === "saved" && recorded.job.status === "failed") {
    await reportFinished(onFinish, recorded, claim.job);
  } else {
    isSaved(recorded, claim.job);
  }
};

/**
 * Reads pages of a claimed job until its history ends or the deadline
 * passes, recording each one, and puts the job back in the queue when the
 * time is up. Stops early when the lock of the job is lost.
 *
 * @returns The number of videos saved.
 */
const workOnJob = async (
  queue: BackfillQueue,
  scraper: Scraper,
  claimed: BackfillClaim,
  deadline: Temporal.Instant,
  clock: Clock,
  onFinish: OnFinish | undefined
): Promise<number> => {
  let claim = claimed;
  let added = 0;

  while (true) {
    const { job, token } = claim;
    let page: Awaited<ReturnType<Scraper["addPastVideos"]>>;

    try {
      // oxlint-disable-next-line eslint/no-await-in-loop -- each page is read with the cursor of the previous one, one request at a time for the quota
      page = await scraper.addPastVideos({
        accountId: job.accountId,
        cursor: job.cursor,
        now: clock(),
      });
    } catch (error) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- the job is released before the loop ends
      await recordFailure(queue, claim, error, onFinish);

      return added;
    }

    added += page.added;

    const done = page.cursor === null;
    // oxlint-disable-next-line eslint/no-await-in-loop -- the progress is saved before the next page is read
    const recorded = await queue.recordPage(claim, {
      added: page.added,
      done,
      nextCursor: page.cursor,
    });

    if (done) {
      if (recorded.status === "saved") {
        logger.info("過去動画の取り込みが完了しました", {
          added: recorded.job.added,
          jobId: job.id,
          pages: recorded.job.pages,
          talentId: job.talentId,
        });
      }

      // oxlint-disable-next-line eslint/no-await-in-loop -- the finished job is reported before the loop ends
      await reportFinished(onFinish, recorded, job);

      return added;
    }

    if (!isSaved(recorded, job)) {
      return added;
    }

    claim = { job: recorded.job, token };

    if (!isBefore(clock, deadline)) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- the job is put back before the loop ends
      isSaved(await queue.requeue(claim), job);

      return added;
    }
  }
};

/**
 * Works off the backfill queue until it is empty or the deadline passes.
 *
 * Every job is worked on at most once per run: one that comes around again
 * (it is the only one queued, or it failed and waits for a retry) is left for
 * the next run, so retries are spread over runs instead of happening in a
 * burst.
 */
export const workOffBackfillQueue = async ({
  clock = systemClock,
  deadline,
  getScraper,
  onFinish,
  queue,
}: WorkOffBackfillQueueOptions): Promise<BackfillRunResult> => {
  const seen = new Set<string>();
  let added = 0;

  while (isBefore(clock, deadline)) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- one job is worked on at a time, until the deadline
    const claim = await queue.claim();

    if (!claim) {
      break;
    }

    const { job } = claim;

    if (seen.has(job.id)) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- the job is put back before the loop ends
      isSaved(await queue.requeue(claim), job);
      break;
    }

    seen.add(job.id);
    // oxlint-disable-next-line eslint/no-await-in-loop -- one job is worked on at a time, until the deadline
    added += await workOnJob(
      queue,
      getScraper(job.provider),
      claim,
      deadline,
      clock,
      onFinish
    );
  }

  return { added, jobs: seen.size };
};
