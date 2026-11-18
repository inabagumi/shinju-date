import * as Sentry from "@sentry/nextjs";
import { createErrorResponse } from "@shinju-date/helpers";
import { logger } from "@shinju-date/logger";
import { after } from "next/server";

import { serverEnv } from "./env";
import { acquireLock, releaseLock } from "./lock";

/** How long to wait for Sentry to send buffered events after the response. */
const SENTRY_FLUSH_TIMEOUT_MS = 10_000;

/**
 * How much longer than `maxDurationSeconds` the lock of a run lasts. A run
 * that Vercel stops before it can release the lock still loses it soon
 * after.
 */
const LOCK_MARGIN_SECONDS = 10;

export interface CronJob {
  /**
   * `maxDuration` of the route, in seconds. A test keeps the two in sync.
   * The lock of a run lasts this long plus `LOCK_MARGIN_SECONDS`.
   */
  maxDurationSeconds: number;
  /**
   * Path (including the query string) Vercel Cron requests.
   * Doubles as the Sentry monitor slug, and the identifier of the lock is
   * made from it (`getCronJobIdentifier`).
   */
  path: string;
  /**
   * Lets runs overlap, but only one of them start in each window, instead
   * of keeping a run from starting until the previous one ends. Only for a
   * job that keeps its overlapping runs from doing the same work by itself.
   */
  ratelimit?: {
    limit(identifier: string): Promise<{ success: boolean }>;
  };
  /** Crontab expression in UTC. Must match the entry in `vercel.json`. */
  schedule: string;
}

/**
 * The identifier of the lock (or the rate limit) of a job: the segments of
 * the path and the query parameters sorted by name, joined with colons
 * (`/videos/check?provider=twitch&mode=all` is
 * `videos:check:mode=all:provider=twitch`).
 */
export function getCronJobIdentifier(path: string): string {
  const url = new URL(path, "http://localhost");

  url.searchParams.sort();

  return [
    ...url.pathname.split("/").filter(Boolean),
    ...[...url.searchParams].map(([name, value]) => `${name}=${value}`),
  ].join(":");
}

export interface RunCronJobOptions {
  /**
   * Called after `run` throws, before the run is reported as failed. Use it
   * to clean up after work that was partly done. An error it throws is
   * logged and does not change the response.
   */
  onError?: (error: unknown) => Promise<void>;
}

interface VerifyCronRequestOptions {
  /** The value of `CRON_SECRET`, which Vercel Cron sends as a bearer token. */
  cronSecure: string;
}

/**
 * Whether the request carries the cron secret in its `Authorization` header
 * (`Bearer <secret>`).
 */
export function verifyCronRequest(
  request: Request,
  { cronSecure }: VerifyCronRequestOptions
): boolean {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return false;
  }

  const [type, credentials] = authHeader
    .split(/\s+/)
    .map((value) => value.trim());

  return type === "Bearer" && credentials === cronSecure;
}

/**
 * Runs a cron route handler with the plumbing every job needs:
 *
 * 1. rejects requests without the cron secret (401)
 * 2. rejects a run while the previous one is still running (429), and
 *    releases the lock after the run, whether it succeeds or fails, so that
 *    a failed job can be run again right away (a job with `ratelimit`
 *    instead rejects a run in the same window as the previous one)
 * 3. reports the run to Sentry Cron Monitoring, as `ok` or `error`
 * 4. turns a thrown error into a 500 instead of an unreported crash
 *
 * `run` only has to do the actual work and throw when it fails. What it
 * returns is sent as JSON with 200; when it returns nothing, the response is
 * 204.
 */
export async function runCronJob<T>(
  request: Request,
  job: CronJob,
  run: () => Promise<T>,
  { onError }: RunCronJobOptions = {}
): Promise<Response> {
  const cronSecure = serverEnv.CRON_SECRET;

  if (cronSecure && !verifyCronRequest(request, { cronSecure })) {
    logger.warn("CRON_SECRETが一致しませんでした", { path: job.path });

    return createErrorResponse("Unauthorized", { status: 401 });
  }

  const identifier = getCronJobIdentifier(job.path);

  if (job.ratelimit) {
    const { success } = await job.ratelimit.limit(identifier);

    if (!success) {
      logger.warn("前回の実行から間隔が空いていません", { path: job.path });

      return createErrorResponse(
        "There has been no interval since the last run.",
        { status: 429 }
      );
    }

    return runAndReport(job, run, onError);
  }

  const lock = await acquireLock(
    identifier,
    job.maxDurationSeconds + LOCK_MARGIN_SECONDS
  );

  if (!lock) {
    logger.warn("前回の実行が終わっていません", { path: job.path });

    return createErrorResponse("The previous run has not finished yet.", {
      status: 429,
    });
  }

  try {
    return await runAndReport(job, run, onError);
  } finally {
    try {
      await releaseLock(identifier, lock);
    } catch (error) {
      // The lock runs out by itself, so the run is not failed for this.
      logger.error("ロックを外せませんでした", { error, path: job.path });
    }
  }
}

/**
 * Runs the job and reports it to Sentry Cron Monitoring. A thrown error
 * becomes a 500.
 */
async function runAndReport<T>(
  job: CronJob,
  run: () => Promise<T>,
  onError: RunCronJobOptions["onError"]
): Promise<Response> {
  const checkInId = Sentry.captureCheckIn(
    {
      monitorSlug: job.path,
      status: "in_progress",
    },
    {
      schedule: {
        type: "crontab",
        value: job.schedule,
      },
      timezone: "Etc/UTC",
    }
  );

  after(() => Sentry.flush(SENTRY_FLUSH_TIMEOUT_MS));

  let result: T;

  try {
    result = await run();
  } catch (error) {
    if (onError) {
      try {
        await onError(error);
      } catch (onErrorError) {
        logger.error("失敗したジョブの後始末に失敗しました", {
          error: onErrorError,
          path: job.path,
        });
      }
    }

    Sentry.captureException(error);
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: job.path,
      status: "error",
    });

    return createErrorResponse(
      error instanceof Error ? error.message : "Unknown error",
      { status: 500 }
    );
  }

  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: job.path,
    status: "ok",
  });

  if (result === undefined) {
    return new Response(null, { status: 204 });
  }

  return Response.json(result, { status: 200 });
}
