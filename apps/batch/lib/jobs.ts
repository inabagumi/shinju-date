import type { Enums } from "@shinju-date/database";

import type { CronJob } from "./cron";
import { videosBackfill } from "./ratelimit";

export type VideosCheckMode = "default" | "recent" | "all";

/*
 * Every cron job of the batch app.
 *
 * The schedules are duplicated from `vercel.json` because Sentry needs them
 * to detect missed runs; a test keeps the two in sync.
 *
 * `maxDurationSeconds` is duplicated from the `maxDuration` of each route,
 * because Next.js reads it only as a literal exported from the route file;
 * a test keeps the two in sync too. Each job notes why its route needs that
 * long.
 */

/**
 * `maxDuration`: 120 seconds. Fetches every channel from the API of the
 * provider, page by page.
 */
const TALENTS_UPDATE_JOBS: Record<Enums<"platform_type">, CronJob> = {
  twitch: {
    maxDurationSeconds: 120,
    path: "/talents/update?provider=twitch",
    schedule: "51 1/3 * * *",
  },
  youtube: {
    maxDurationSeconds: 120,
    path: "/talents/update",
    schedule: "21 1/3 * * *",
  },
};

/**
 * `maxDuration`: 120 seconds. Reads the latest videos of every channel from
 * the API of the provider.
 */
const VIDEOS_UPDATE_JOBS: Record<Enums<"platform_type">, CronJob> = {
  twitch: {
    maxDurationSeconds: 120,
    path: "/videos/update?provider=twitch",
    schedule: "3/5 * * * *",
  },
  youtube: {
    maxDurationSeconds: 120,
    path: "/videos/update",
    schedule: "1/5 * * * *",
  },
};

/**
 * Needs 120 seconds: `mode=all` asks the API of the provider about
 * every video in the database.
 */
const VIDEOS_CHECK_JOBS: Record<
  Enums<"platform_type">,
  Record<VideosCheckMode, CronJob>
> = {
  twitch: {
    all: {
      maxDurationSeconds: 120,
      path: "/videos/check?provider=twitch&mode=all",
      schedule: "34 23 * * 2,4",
    },
    default: {
      maxDurationSeconds: 120,
      path: "/videos/check?provider=twitch",
      schedule: "*/1 * * * *",
    },
    recent: {
      maxDurationSeconds: 120,
      path: "/videos/check?provider=twitch&mode=recent",
      schedule: "15,45 * * * *",
    },
  },
  youtube: {
    all: {
      maxDurationSeconds: 120,
      path: "/videos/check?mode=all",
      schedule: "4 23 * * 2,4",
    },
    default: {
      maxDurationSeconds: 120,
      path: "/videos/check",
      schedule: "*/1 * * * *",
    },
    recent: {
      maxDurationSeconds: 120,
      path: "/videos/check?mode=recent",
      schedule: "*/30 * * * *",
    },
  },
};

/**
 * Works off the backfill queue that the admin app fills. Runs every minute
 * but only does work while jobs are queued; the rate limit is separate from
 * `/videos/update` so a backfill never delays the discovery of new videos.
 *
 * Rate limited instead of locked: a run starts new pages for only 50
 * seconds so that the next run can start while it finishes its last page,
 * and the lock of each job in `@shinju-date/video-backfill` keeps the two
 * from reading the same job.
 *
 * `maxDuration`: 120 seconds. A run starts new pages for 50 seconds, and the
 * page in progress when that runs out still has to finish.
 */
export const VIDEOS_BACKFILL_JOB: CronJob = {
  maxDurationSeconds: 120,
  path: "/videos/backfill",
  ratelimit: videosBackfill,
  schedule: "*/1 * * * *",
};

/**
 * Soft-deletes the videos of deleted talents and restores those of talents
 * that are back.
 *
 * `maxDuration`: 60 seconds. A run handles at most `BATCH_LIMIT` (100) videos
 * in each direction, and the rest waits for the next run 5 minutes later.
 */
export const VIDEOS_CASCADE_FROM_TALENTS_JOB: CronJob = {
  maxDurationSeconds: 60,
  path: "/videos/cascade-from-talents",
  schedule: "*/5 * * * *",
};

/**
 * Saves the statistics of the previous day (in `TIME_ZONE`) for the
 * dashboard of the admin app. Runs at 0:10 in Japan, just after the day ends.
 *
 * `maxDuration`: 60 seconds. Only counts rows and reads a few Redis keys.
 */
export const STATS_SNAPSHOT_JOB: CronJob = {
  maxDurationSeconds: 60,
  path: "/stats/snapshot",
  schedule: "10 15 * * *",
};

/**
 * Copies the search counts of the terms to the database. Runs at midnight
 * UTC, after the searches of the day are counted.
 *
 * `maxDuration`: 60 seconds. Reads one sorted set and updates the terms in
 * batches of `UPDATE_BATCH_SIZE` (500).
 */
export const TERMS_POPULARITY_UPDATE_JOB: CronJob = {
  maxDurationSeconds: 60,
  path: "/terms/popularity/update",
  schedule: "0 0 * * *",
};

/**
 * Picks the recommended search queries from the popular searches.
 *
 * `maxDuration`: 120 seconds. Reads every term with its synonyms, page by
 * page of `TERMS_PAGE_SIZE` (1,000), to match them against the searches.
 */
export const RECOMMENDATION_QUERIES_UPDATE_JOB: CronJob = {
  maxDurationSeconds: 120,
  path: "/recommendation/queries/update",
  schedule: "17 1 * * *",
};

/**
 * Deletes the thumbnails and icons that no video or account uses any more
 * (`Scraper#cleanUpImages`). Images are shared by every platform, so one job
 * cleans up all of them. Runs daily, apart from the video jobs, so that a
 * slow clean-up never holds them up, and so that each run has little to do.
 *
 * `maxDuration`: 60 seconds. A run deletes at most 500 thumbnails, 100 at a
 * time, and the icons of the accounts that no longer use them.
 */
export const IMAGES_CLEANUP_JOB: CronJob = {
  maxDurationSeconds: 60,
  path: "/images/cleanup",
  schedule: "44 19 * * *",
};

export function getTalentsUpdateJob(provider: Enums<"platform_type">): CronJob {
  return TALENTS_UPDATE_JOBS[provider];
}

export function getVideosUpdateJob(provider: Enums<"platform_type">): CronJob {
  return VIDEOS_UPDATE_JOBS[provider];
}

export function getVideosCheckJob(
  provider: Enums<"platform_type">,
  mode: VideosCheckMode
): CronJob {
  return VIDEOS_CHECK_JOBS[provider][mode];
}

/** Every job, for consistency checks against `vercel.json`. */
export const JOBS: readonly CronJob[] = [
  ...Object.values(TALENTS_UPDATE_JOBS),
  ...Object.values(VIDEOS_UPDATE_JOBS),
  ...Object.values(VIDEOS_CHECK_JOBS).flatMap((jobs) => Object.values(jobs)),
  VIDEOS_BACKFILL_JOB,
  VIDEOS_CASCADE_FROM_TALENTS_JOB,
  STATS_SNAPSHOT_JOB,
  TERMS_POPULARITY_UPDATE_JOB,
  RECOMMENDATION_QUERIES_UPDATE_JOB,
  IMAGES_CLEANUP_JOB,
];
