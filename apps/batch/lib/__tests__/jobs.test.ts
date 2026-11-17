import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import vercelConfig from '../../vercel.json' with { type: 'json' }
import { getCronJobIdentifier } from '../cron'
import {
  getTalentsUpdateJob,
  getVideosCheckJob,
  getVideosUpdateJob,
  JOBS,
} from '../jobs'

/** The `maxDuration` the route of `path` exports, read from its source. */
async function readMaxDuration(path: string): Promise<number | undefined> {
  const { pathname } = new URL(path, 'http://localhost')
  const source = await readFile(
    new URL(`../../app${pathname}/route.ts`, import.meta.url),
    'utf8',
  )
  const value = source.match(/^export const maxDuration = (\d+)$/m)?.[1]

  return value === undefined ? undefined : Number(value)
}

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

  it('lock each job separately so providers never block each other', () => {
    const identifiers = JOBS.map((job) => getCronJobIdentifier(job.path))

    expect(new Set(identifiers).size).toBe(identifiers.length)
  })

  it.each(JOBS.map((job) => [job.path, job.maxDurationSeconds] as const))(
    'stay in sync with the maxDuration of %s',
    async (path, seconds) => {
      await expect(readMaxDuration(path)).resolves.toBe(seconds)
    },
  )

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
