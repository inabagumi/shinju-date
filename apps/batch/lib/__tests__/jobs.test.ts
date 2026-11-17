import { describe, expect, it, vi } from 'vitest'
import vercelConfig from '../../vercel.json' with { type: 'json' }

vi.mock('../ratelimit', () => ({
  recommendationQueriesUpdate: { limit: vi.fn() },
  statsSnapshot: { limit: vi.fn() },
  talentsUpdate: { limit: vi.fn() },
  termsPopularityUpdate: { limit: vi.fn() },
  videosBackfill: { limit: vi.fn() },
  videosCascadeFromTalents: { limit: vi.fn() },
  videosCheck: { limit: vi.fn() },
  videosCheckAll: { limit: vi.fn() },
  videosCheckRecent: { limit: vi.fn() },
  videosUpdate: { limit: vi.fn() },
}))

const { JOBS, getTalentsUpdateJob, getVideosCheckJob, getVideosUpdateJob } =
  await import('../jobs')

/** Compares query strings regardless of parameter order. */
function normalize(path: string): string {
  const url = new URL(path, 'http://localhost')

  url.searchParams.sort()

  return `${url.pathname}${url.search}`
}

describe('jobs', () => {
  it('stay in sync with the schedules in vercel.json', () => {
    const scheduled = Object.fromEntries(
      vercelConfig.crons.map((cron) => [normalize(cron.path), cron.schedule]),
    )
    const defined = Object.fromEntries(
      JOBS.map((job) => [normalize(job.path), job.schedule]),
    )

    expect(defined).toEqual(scheduled)
  })

  it('define each path only once', () => {
    const paths = JOBS.map((job) => normalize(job.path))

    expect(new Set(paths).size).toBe(paths.length)
  })

  it('count each job separately so providers never block each other', () => {
    const keys = JOBS.map((job) => job.ratelimitKey)

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
