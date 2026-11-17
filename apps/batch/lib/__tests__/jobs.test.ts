import { describe, expect, it, vi } from 'vitest'
import vercelConfig from '../../vercel.json' with { type: 'json' }

vi.mock('../ratelimit', () => ({
  talentsUpdate: { limit: vi.fn() },
  videosBackfill: { limit: vi.fn() },
  videosCheck: { limit: vi.fn() },
  videosCheckAll: { limit: vi.fn() },
  videosCheckRecent: { limit: vi.fn() },
  videosUpdate: { limit: vi.fn() },
}))

const {
  CRAWLER_JOBS,
  getTalentsUpdateJob,
  getVideosCheckJob,
  getVideosUpdateJob,
} = await import('../crawler-jobs')

const CRAWLER_ROUTES = [
  '/talents/update',
  '/videos/backfill',
  '/videos/check',
  '/videos/update',
]

function isCrawlerPath(path: string): boolean {
  return CRAWLER_ROUTES.some(
    (route) => path === route || path.startsWith(`${route}?`),
  )
}

/** Compares query strings regardless of parameter order. */
function normalize(path: string): string {
  const url = new URL(path, 'http://localhost')

  url.searchParams.sort()

  return `${url.pathname}${url.search}`
}

describe('crawler jobs', () => {
  it('stay in sync with the schedules in vercel.json', () => {
    const scheduled = Object.fromEntries(
      vercelConfig.crons
        .filter((cron) => isCrawlerPath(cron.path))
        .map((cron) => [normalize(cron.path), cron.schedule]),
    )
    const defined = Object.fromEntries(
      CRAWLER_JOBS.map((job) => [normalize(job.path), job.schedule]),
    )

    expect(defined).toEqual(scheduled)
  })

  it('count each job separately so providers never block each other', () => {
    const keys = CRAWLER_JOBS.map((job) => job.ratelimitKey)

    expect(new Set(keys).size).toBe(keys.length)
  })

  it('resolves the job of a request', () => {
    expect(getVideosUpdateJob('youtube').path).toBe('/videos/update')
    expect(getVideosUpdateJob('twitch').path).toBe(
      '/videos/update?provider=twitch',
    )
    expect(getVideosCheckJob('youtube', 'default').path).toBe('/videos/check')
    expect(getVideosCheckJob('youtube', 'recent').path).toBe(
      '/videos/check?mode=recent',
    )
    expect(getVideosCheckJob('twitch', 'all').path).toBe(
      '/videos/check?provider=twitch&mode=all',
    )
    expect(getTalentsUpdateJob('twitch').path).toBe(
      '/talents/update?provider=twitch',
    )
  })
})
