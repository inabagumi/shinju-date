import type { CronJob } from './cron'
import type { Provider } from './provider'
import * as ratelimit from './ratelimit'

export type VideosCheckMode = 'default' | 'recent' | 'all'

/**
 * Cron jobs that crawl YouTube and Twitch.
 *
 * The schedules are duplicated from `vercel.json` because Sentry needs them
 * to detect missed runs; a test keeps the two in sync.
 */
const TALENTS_UPDATE_JOBS: Record<Provider, CronJob> = {
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

const VIDEOS_UPDATE_JOBS: Record<Provider, CronJob> = {
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

const VIDEOS_CHECK_JOBS: Record<Provider, Record<VideosCheckMode, CronJob>> = {
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
 */
export const VIDEOS_BACKFILL_JOB: CronJob = {
  path: '/videos/backfill',
  ratelimit: ratelimit.videosBackfill,
  ratelimitKey: 'videos:backfill',
  schedule: '*/1 * * * *',
}

export function getTalentsUpdateJob(provider: Provider): CronJob {
  return TALENTS_UPDATE_JOBS[provider]
}

export function getVideosUpdateJob(provider: Provider): CronJob {
  return VIDEOS_UPDATE_JOBS[provider]
}

export function getVideosCheckJob(
  provider: Provider,
  mode: VideosCheckMode,
): CronJob {
  return VIDEOS_CHECK_JOBS[provider][mode]
}

/** Every crawler job, for consistency checks against `vercel.json`. */
export const CRAWLER_JOBS: readonly CronJob[] = [
  ...Object.values(TALENTS_UPDATE_JOBS),
  ...Object.values(VIDEOS_UPDATE_JOBS),
  ...Object.values(VIDEOS_CHECK_JOBS).flatMap((jobs) => Object.values(jobs)),
  VIDEOS_BACKFILL_JOB,
]
