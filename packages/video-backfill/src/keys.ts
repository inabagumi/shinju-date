import { REDIS_KEYS } from "@shinju-date/constants";

import type { BackfillProvider } from "./types.js";

/** How long jobs and the queue are kept after their last change (7 days). */
export const BACKFILL_JOB_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * How long a worker may run, by default, in seconds. The lease of a claim
 * is made from it (`BackfillQueueOptions.maxRunSeconds`).
 */
export const BACKFILL_DEFAULT_MAX_RUN_SECONDS = 5 * 60;

/**
 * Time added to the longest a worker may run to make the lease of a claim,
 * for the time a claim takes to reach Redis and clocks that differ.
 */
export const BACKFILL_LEASE_MARGIN_SECONDS = 60;

/**
 * A job that waited this long in the queue is considered lost (e.g. dropped
 * by a worker that crashed) and may be requested again.
 */
export const BACKFILL_PENDING_TIMEOUT_SECONDS = 60 * 60;

/**
 * How long a claim is locked, in seconds: the longest a worker may run, and
 * {@link BACKFILL_LEASE_MARGIN_SECONDS}.
 */
export function getLeaseSeconds(
  maxRunSeconds: number = BACKFILL_DEFAULT_MAX_RUN_SECONDS
): number {
  return Math.ceil(maxRunSeconds) + BACKFILL_LEASE_MARGIN_SECONDS;
}

export function getBackfillJobId(
  provider: BackfillProvider,
  accountId: string
): string {
  return `${provider}:${accountId}`;
}

export function jobKey(id: string): string {
  return `${REDIS_KEYS.VIDEO_BACKFILL_JOB_PREFIX}${id}`;
}

export function lockKey(id: string): string {
  return `${REDIS_KEYS.VIDEO_BACKFILL_LOCK_PREFIX}${id}`;
}

/**
 * Key of the outcome of a job of a check of all accounts, kept when the job
 * finishes so the check still shows it after the job is requested again on
 * its own.
 */
export function getRunResultKey(runId: string, jobId: string): string {
  return `${REDIS_KEYS.VIDEO_BACKFILL_RUN_RESULT_PREFIX}${runId}:${jobId}`;
}
