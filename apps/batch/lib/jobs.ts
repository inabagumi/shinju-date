import type { Enums } from '@shinju-date/database'
import type { CronJob } from './cron'
import * as ratelimit from './ratelimit'

export type VideosCheckMode = 'default' | 'recent' | 'all'

/*
 * Every cron job of the batch app.
 *
 * The schedules are duplicated from `vercel.json` because Sentry needs them
 * to detect missed runs; a test keeps the two in sync.
 *
 * `maxDuration` cannot live here: Next.js reads it only as a literal exported
 * from the route file. Each job notes the value its route uses and why.
 */

/**
 * `maxDuration`: 120 seconds. Fetches every channel from the API of the
 * provider, page by page.
 */
const TALENTS_UPDATE_JOBS: Record<Enums<'platform_type'>, CronJob> = {
  twitch: {
    path: '/talents/update?provider=twitch',
    ratelimit: ratelimit.talentsUpdate,
    ratelimitKey: 'channels:update:twitch',
    schedule: '51 1/3 * * *',
  },
  youtube: {
    path: '/talents/update',
    ratelimit: ratelimit.talentsUpdate,
    ratelimitKey: 'channels:update:youtube',
    schedule: '21 1/3 * * *',
  },
}

/**
 * `maxDuration`: 120 seconds. Reads the latest videos of every channel from
 * the API of the provider.
 */
const VIDEOS_UPDATE_JOBS: Record<Enums<'platform_type'>, CronJob> = {
  twitch: {
    path: '/videos/update?provider=twitch',
    ratelimit: ratelimit.videosUpdate,
    ratelimitKey: 'videos:update:twitch',
    schedule: '3/5 * * * *',
  },
  youtube: {
    path: '/videos/update',
    ratelimit: ratelimit.videosUpdate,
    ratelimitKey: 'videos:update:youtube',
    schedule: '1/5 * * * *',
  },
}

/**
 * `maxDuration`: 120 seconds. `mode=all` asks the API of the provider about
 * every video in the database.
 */
const VIDEOS_CHECK_JOBS: Record<
  Enums<'platform_type'>,
  Record<VideosCheckMode, CronJob>
> = {
  twitch: {
    all: {
      path: '/videos/check?provider=twitch&mode=all',
      ratelimit: ratelimit.videosCheckAll,
      ratelimitKey: 'videos:check:all:twitch',
      schedule: '34 23 * * 2,4',
    },
    default: {
      path: '/videos/check?provider=twitch',
      ratelimit: ratelimit.videosCheck,
      ratelimitKey: 'videos:check:twitch',
      schedule: '*/1 * * * *',
    },
    recent: {
      path: '/videos/check?provider=twitch&mode=recent',
      ratelimit: ratelimit.videosCheckRecent,
      ratelimitKey: 'videos:check:recent:twitch',
      schedule: '15,45 * * * *',
    },
  },
  youtube: {
    all: {
      path: '/videos/check?mode=all',
      ratelimit: ratelimit.videosCheckAll,
      ratelimitKey: 'videos:check:all:youtube',
      schedule: '4 23 * * 2,4',
    },
    default: {
      path: '/videos/check',
      ratelimit: ratelimit.videosCheck,
      ratelimitKey: 'videos:check:youtube',
      schedule: '*/1 * * * *',
    },
    recent: {
      path: '/videos/check?mode=recent',
      ratelimit: ratelimit.videosCheckRecent,
      ratelimitKey: 'videos:check:recent:youtube',
      schedule: '*/30 * * * *',
    },
  },
}

/**
 * Works off the backfill queue that the admin app fills. Runs every minute
 * but only does work while jobs are queued; the rate limit is separate from
 * `/videos/update` so a backfill never delays the discovery of new videos.
 *
 * `maxDuration`: 120 seconds. A run starts new pages for 50 seconds, and the
 * page in progress when that runs out still has to finish.
 */
export const VIDEOS_BACKFILL_JOB: CronJob = {
  path: '/videos/backfill',
  ratelimit: ratelimit.videosBackfill,
  ratelimitKey: 'videos:backfill',
  schedule: '*/1 * * * *',
}

/**
 * Soft-deletes the videos of deleted talents and restores those of talents
 * that are back.
 *
 * `maxDuration`: 60 seconds. A run handles at most `BATCH_LIMIT` (100) videos
 * in each direction, and the rest waits for the next run 5 minutes later.
 */
export const VIDEOS_CASCADE_FROM_TALENTS_JOB: CronJob = {
  path: '/videos/cascade-from-talents',
  ratelimit: ratelimit.videosCascadeFromTalents,
  ratelimitKey: 'videos:cascade-from-talents',
  schedule: '*/5 * * * *',
}

/**
 * Saves the statistics of the previous day (in `TIME_ZONE`) for the
 * dashboard of the admin app. Runs at 0:10 in Japan, just after the day ends.
 *
 * `maxDuration`: 60 seconds. Only counts rows and reads a few Redis keys.
 */
export const STATS_SNAPSHOT_JOB: CronJob = {
  path: '/stats/snapshot',
  ratelimit: ratelimit.statsSnapshot,
  ratelimitKey: 'stats:snapshot',
  schedule: '10 15 * * *',
}

/**
 * Copies the search counts of the terms to the database. Runs at midnight
 * UTC, after the searches of the day are counted.
 *
 * `maxDuration`: 60 seconds. Reads one sorted set and updates the terms in
 * batches of `UPDATE_BATCH_SIZE` (500).
 */
export const TERMS_POPULARITY_UPDATE_JOB: CronJob = {
  path: '/terms/popularity/update',
  ratelimit: ratelimit.termsPopularityUpdate,
  ratelimitKey: 'terms:popularity:update',
  schedule: '0 0 * * *',
}

/**
 * Picks the recommended search queries from the popular searches.
 *
 * `maxDuration`: 120 seconds. Reads every term with its synonyms, page by
 * page of `TERMS_PAGE_SIZE` (1,000), to match them against the searches.
 */
export const RECOMMENDATION_QUERIES_UPDATE_JOB: CronJob = {
  path: '/recommendation/queries/update',
  ratelimit: ratelimit.recommendationQueriesUpdate,
  ratelimitKey: 'recommendation:queries:update',
  schedule: '17 1 * * *',
}

export function getTalentsUpdateJob(provider: Enums<'platform_type'>): CronJob {
  return TALENTS_UPDATE_JOBS[provider]
}

export function getVideosUpdateJob(provider: Enums<'platform_type'>): CronJob {
  return VIDEOS_UPDATE_JOBS[provider]
}

export function getVideosCheckJob(
  provider: Enums<'platform_type'>,
  mode: VideosCheckMode,
): CronJob {
  return VIDEOS_CHECK_JOBS[provider][mode]
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
]
