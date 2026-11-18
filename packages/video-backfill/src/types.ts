import type { Enums } from "@shinju-date/database";

/** Platform whose account a job reads, as in `videos.platform`. */
export type BackfillProvider = Enums<"platform_type">;

/**
 * - `pending`: waiting in the queue (for the first time, or to continue)
 * - `running`: a worker is reading it
 * - `done`: the whole history was read
 * - `failed`: given up; can be requested again to resume
 */
export type BackfillJobStatus = "pending" | "running" | "done" | "failed";

/**
 * A request to read the whole history of one platform account and save the
 * videos that are not saved yet.
 */
export interface BackfillJob {
  /** Primary key of the account row (`youtube_channels` / `twitch_users`). */
  accountId: string;
  /** Videos saved so far. */
  added: number;
  /** Consecutive runs that failed; reset by a page that succeeds. */
  attempts: number;
  /** Where reading continues, or `null` to start from the newest videos. */
  cursor: string | null;
  /** Why the job failed, when it did. */
  error: string | null;
  finishedAt: string | null;
  id: string;
  /** Pages read so far. */
  pages: number;
  provider: BackfillProvider;
  requestedAt: string;
  /** ID of the admin user who requested the job. */
  requestedBy: string | null;
  /**
   * ID of the check of all accounts ({@link BackfillRun}) the job belongs to,
   * if any. Absent on jobs queued before such checks existed.
   */
  runId?: string | null;
  startedAt: string | null;
  status: BackfillJobStatus;
  talentId: string;
  updatedAt: string;
  /**
   * Incremented by every write of the job, so that a request saves it only
   * if it is still what the request read. Absent on jobs saved before
   * versions existed, which count as version 0.
   */
  version?: number;
}

/**
 * Status of a job as it is shown to admins. `interrupted` is a job that is
 * `pending` or `running` but neither queued nor being read: it stopped
 * without finishing (e.g. its worker timed out, or it was lost) and can be
 * requested again to resume.
 */
export type BackfillActivityStatus = BackfillJobStatus | "interrupted";

export interface BackfillJobActivity {
  /**
   * Whether the job is queued or being read. An active job cannot be
   * requested again; one that is interrupted can.
   */
  active: boolean;
  status: BackfillActivityStatus;
}

export interface BackfillJobState extends BackfillJobActivity {
  job: BackfillJob;
}

export interface GetJobActivityOptions {
  /** Whether a worker holds the lock of the job. */
  locked: boolean;
  /** Current time (default: the system clock). */
  now?: Temporal.Instant;
}

export interface BackfillRequest {
  accountId: string;
  provider: BackfillProvider;
  requestedBy: string | null;
  /**
   * Check of all accounts the job is queued for. When omitted, a job that
   * resumes keeps the check it belonged to, so that the check follows it.
   */
  runId?: string | null;
  talentId: string;
}

export type EnqueueResult =
  | { enqueued: true; job: BackfillJob }
  /**
   * A job for the account is queued or being read already, or another request
   * for it changed it at the same moment.
   */
  | { enqueued: false; job: BackfillJob | null };

/**
 * A job a worker claimed, with the token of its lock. The worker passes it to
 * every write, which is made only while the lock still holds the token.
 */
export interface BackfillClaim {
  job: BackfillJob;
  /** The value of the lock, made anew for each claim. */
  token: string;
}

export type BackfillWriteResult =
  | { job: BackfillJob; status: "saved" }
  /**
   * The lock no longer holds the claim's token: its lease ran out, and another
   * worker may have claimed the job since. Nothing was written; the worker
   * should stop working on the job.
   */
  | { status: "lost" };

export interface BackfillQueueOptions {
  /**
   * Keys that a job a worker completed or gave up is also saved to, in the
   * same step as the job itself, such as its outcome for the check it
   * belongs to (`getBackfillRunResultKeys`). They are kept as long as jobs.
   */
  finishedJobKeys?: (job: BackfillJob) => readonly string[];
  /**
   * Runs in a row that may fail before a job is given up (default:
   * `BACKFILL_MAX_ATTEMPTS`).
   */
  maxAttempts?: number;
  /**
   * The longest a worker may run, in seconds, such as the `maxDuration` of
   * the route that works off the queue (default:
   * `BACKFILL_DEFAULT_MAX_RUN_SECONDS`). A claim is locked for this plus
   * `BACKFILL_LEASE_MARGIN_SECONDS`, so that a job is never read by two
   * workers at once; a job whose worker died is free again once the lock
   * runs out.
   */
  maxRunSeconds?: number;
}

/** The result of reading one page of a claimed job. */
export interface BackfillPage {
  /** Videos saved from the page. */
  added: number;
  /** Whether the history ended with the page; the job is then done. */
  done: boolean;
  /** Where reading continues. */
  nextCursor: string | null;
}

export interface BackfillFailureOptions {
  /**
   * Whether retrying cannot help (e.g. the account is gone), so that the job
   * is given up at once.
   */
  permanent?: boolean;
}
