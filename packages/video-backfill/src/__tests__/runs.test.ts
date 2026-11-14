import { REDIS_KEYS } from '@shinju-date/constants'
import type { Redis } from '@upstash/redis'
import { describe, expect, it, vi } from 'vitest'
import {
  BACKFILL_JOB_TTL_SECONDS,
  BACKFILL_RUN_LOCK_SECONDS,
  type BackfillJob,
  BackfillQueue,
  type BackfillRunRequest,
  BackfillRuns,
  getBackfillJobId,
} from '../index.js'
import { FakeRedis } from './fake-redis.js'

const now = Temporal.Instant.from('2026-11-14T00:00:00Z')
const later = (minutes: number) => now.add({ minutes })

const requests: BackfillRunRequest[] = [
  { accountId: 'channel-row-1', provider: 'youtube', talentId: 'talent-1' },
  { accountId: 'twitch-row-1', provider: 'twitch', talentId: 'talent-1' },
  { accountId: 'channel-row-2', provider: 'youtube', talentId: 'talent-2' },
]
const youtubeJobId = getBackfillJobId('youtube', 'channel-row-1')
const twitchJobId = getBackfillJobId('twitch', 'twitch-row-1')
const otherJobId = getBackfillJobId('youtube', 'channel-row-2')

function createRuns() {
  const redis = new FakeRedis()
  const queue = new BackfillQueue(redis as unknown as Redis)

  return {
    queue,
    redis,
    runs: new BackfillRuns(redis as unknown as Redis, queue),
  }
}

/** Claims the next job, failing the test when there is none. */
async function claimJob(
  queue: BackfillQueue,
  at: Temporal.Instant,
): Promise<BackfillJob> {
  const job = await queue.claim(at)

  if (!job) {
    throw new Error('Expected a job to claim')
  }

  return job
}

/** Starts a check, failing the test when it does not start. */
async function startRun(runs: BackfillRuns, at: Temporal.Instant = now) {
  const result = await runs.start(requests, { requestedBy: 'user-1' }, at)

  if (result.status !== 'started') {
    throw new Error(`Expected the check to start, got ${result.status}`)
  }

  return result.run
}

describe('BackfillRuns', () => {
  it('queues one job per account and keeps the check as the latest', async () => {
    const { redis, runs } = createRuns()

    const result = await runs.start(requests, { requestedBy: 'user-1' }, now)

    expect(result).toEqual({
      failed: 0,
      run: {
        failed: 0,
        id: expect.any(String),
        jobs: [
          {
            accountId: 'channel-row-1',
            addedBefore: 0,
            id: youtubeJobId,
            provider: 'youtube',
            talentId: 'talent-1',
          },
          {
            accountId: 'twitch-row-1',
            addedBefore: 0,
            id: twitchJobId,
            provider: 'twitch',
            talentId: 'talent-1',
          },
          {
            accountId: 'channel-row-2',
            addedBefore: 0,
            id: otherJobId,
            provider: 'youtube',
            talentId: 'talent-2',
          },
        ],
        requestedAt: now.toString(),
        requestedBy: 'user-1',
        skipped: 0,
      },
      skipped: 0,
      status: 'started',
    })
    expect(redis.lists.get(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)).toHaveLength(3)
    expect(redis.ttls.get(REDIS_KEYS.VIDEO_BACKFILL_RUN)).toBe(
      BACKFILL_JOB_TTL_SECONDS,
    )
    // The lock is released once the check is saved.
    expect(redis.values.has(REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK)).toBe(false)

    const progress = await runs.getLatest(now)

    expect(progress).toMatchObject({
      active: true,
      added: 0,
      counts: { done: 0, failed: 0, interrupted: 0, pending: 3, running: 0 },
    })
    expect(
      progress?.jobs.every(
        (job) => job.active && job.status === 'pending' && job.added === 0,
      ),
    ).toBe(true)
  })

  it('tags the jobs with the check', async () => {
    const { queue, runs } = createRuns()

    const run = await startRun(runs)

    await expect(queue.getJobs([youtubeJobId], now)).resolves.toEqual([
      {
        active: true,
        job: expect.objectContaining({ requestedBy: 'user-1', runId: run.id }),
      },
    ])
  })

  it('has no latest check before one is requested', async () => {
    const { runs } = createRuns()

    await expect(runs.getLatest(now)).resolves.toBeNull()
  })

  it('refuses a new check while the latest one is in progress', async () => {
    const { redis, runs } = createRuns()

    const run = await startRun(runs)
    const queued = redis.lists.get(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)?.length

    await expect(
      runs.start(requests, { requestedBy: 'user-2' }, later(1)),
    ).resolves.toMatchObject({
      progress: { active: true, run: { id: run.id } },
      status: 'active',
    })
    expect(redis.lists.get(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)?.length).toBe(
      queued,
    )
  })

  it('refuses a check while another request for one is being handled', async () => {
    const { redis, runs } = createRuns()

    await redis.set(REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK, 'other', {
      ex: BACKFILL_RUN_LOCK_SECONDS,
      nx: true,
    })

    await expect(
      runs.start(requests, { requestedBy: 'user-1' }, now),
    ).resolves.toEqual({ status: 'busy' })
    expect(redis.lists.has(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)).toBe(false)
    // Another request's lock is left alone.
    expect(redis.values.get(REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK)).toBe('other')
  })

  it('starts requests for a check made at the same moment once', async () => {
    const { runs } = createRuns()

    const results = await Promise.all([
      runs.start(requests, { requestedBy: 'user-1' }, now),
      runs.start(requests, { requestedBy: 'user-2' }, now),
    ])

    expect(results.map((result) => result.status).sort()).toEqual([
      'busy',
      'started',
    ])
  })

  it('leaves out accounts that are queued or being read already', async () => {
    const { queue, runs } = createRuns()

    // Requested from the talent page before the check.
    await queue.enqueue(
      {
        accountId: 'twitch-row-1',
        provider: 'twitch',
        requestedBy: 'user-2',
        talentId: 'talent-1',
      },
      now,
    )

    const result = await runs.start(requests, { requestedBy: 'user-1' }, now)

    expect(result).toMatchObject({ skipped: 1, status: 'started' })
    expect(
      result.status === 'started' && result.run.jobs.map((job) => job.id),
    ).toEqual([youtubeJobId, otherJobId])
  })

  it('saves no check when no account could be queued', async () => {
    const { queue, redis, runs } = createRuns()

    for (const request of requests) {
      await queue.enqueue({ ...request, requestedBy: 'user-2' }, now)
    }

    await expect(
      runs.start(requests, { requestedBy: 'user-1' }, now),
    ).resolves.toEqual({ failed: 0, skipped: 3, status: 'empty' })
    expect(redis.values.has(REDIS_KEYS.VIDEO_BACKFILL_RUN)).toBe(false)
    expect(redis.values.has(REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK)).toBe(false)
  })

  it('reports the accounts that could not be queued and starts the rest', async () => {
    const { queue, runs } = createRuns()
    const error = new Error('Redis is down')
    const enqueue = queue.enqueue.bind(queue)

    vi.spyOn(queue, 'enqueue').mockImplementation((request, at) =>
      request.accountId === 'twitch-row-1'
        ? Promise.reject(error)
        : enqueue(request, at),
    )
    const onError = vi.fn()

    await expect(
      runs.start(requests, { onError, requestedBy: 'user-1' }, now),
    ).resolves.toMatchObject({
      failed: 1,
      run: { failed: 1, jobs: [{ id: youtubeJobId }, { id: otherJobId }] },
      status: 'started',
    })
    expect(onError).toHaveBeenCalledExactlyOnceWith(requests[1], error)
  })

  it('does not release a lock that another request took after its own ran out', async () => {
    const { queue, redis, runs } = createRuns()
    const enqueue = queue.enqueue.bind(queue)

    vi.spyOn(queue, 'enqueue').mockImplementation(async (request, at) => {
      // The lock ran out while accounts were queued, and another request
      // for a check took it.
      redis.values.set(REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK, 'other')

      return enqueue(request, at)
    })

    await expect(
      runs.start(requests, { requestedBy: 'user-1' }, now),
    ).resolves.toMatchObject({ status: 'started' })
    expect(redis.values.get(REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK)).toBe('other')
  })

  it('releases the lock when the check cannot be saved', async () => {
    const { redis, runs } = createRuns()
    const set = redis.set.bind(redis)

    vi.spyOn(redis, 'set').mockImplementation((key, value, options) =>
      key === REDIS_KEYS.VIDEO_BACKFILL_RUN
        ? Promise.reject(new Error('Redis is down'))
        : set(key, value, options),
    )

    await expect(
      runs.start(requests, { requestedBy: 'user-1' }, now),
    ).rejects.toThrow('Redis is down')
    expect(redis.values.has(REDIS_KEYS.VIDEO_BACKFILL_RUN_LOCK)).toBe(false)
  })

  it('counts the jobs by status and the videos they added', async () => {
    const { queue, runs } = createRuns()

    await startRun(runs)

    // Jobs are claimed in the order they were queued.
    const youtube = await claimJob(queue, later(1))
    await queue.complete({ ...youtube, added: 4, cursor: null }, later(2))
    const twitch = await claimJob(queue, later(2))
    await queue.fail({ ...twitch, added: 1 }, 'quota exceeded', later(3))
    const other = await claimJob(queue, later(3))
    await queue.update({ ...other, added: 2 }, later(4))

    await expect(runs.getLatest(later(5))).resolves.toMatchObject({
      active: true,
      added: 7,
      counts: { done: 1, failed: 1, interrupted: 0, pending: 0, running: 1 },
      jobs: [
        { active: false, added: 4, id: youtubeJobId, status: 'done' },
        {
          active: false,
          added: 1,
          error: 'quota exceeded',
          id: twitchJobId,
          status: 'failed',
        },
        { active: true, added: 2, id: otherJobId, status: 'running' },
      ],
    })

    await queue.complete({ ...other, added: 2, cursor: null }, later(6))

    await expect(runs.getLatest(later(7))).resolves.toMatchObject({
      active: false,
      counts: { done: 2, failed: 1, running: 0 },
    })
  })

  it('shows a job whose worker died as interrupted and lets a new check resume it', async () => {
    const { queue, redis, runs } = createRuns()

    await startRun(runs)
    const job = await claimJob(queue, later(1))
    await queue.update({ ...job, added: 3, cursor: 'page-2' }, later(2))
    // Every lease ran out and the other jobs were lost.
    redis.values.delete(`${REDIS_KEYS.VIDEO_BACKFILL_LOCK_PREFIX}${job.id}`)
    redis.lists.delete(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)

    await expect(runs.getLatest(later(90))).resolves.toMatchObject({
      active: false,
      counts: { interrupted: 3 },
    })

    const run = await startRun(runs, later(91))

    expect(run.jobs[0]).toMatchObject({ addedBefore: 3, id: youtubeJobId })
    await expect(queue.getJobs([youtubeJobId], later(91))).resolves.toEqual([
      {
        active: true,
        job: expect.objectContaining({ cursor: 'page-2', runId: run.id }),
      },
    ])

    // Only what was added since the new check counts for it.
    const resumed = await claimJob(queue, later(92))
    await queue.complete({ ...resumed, added: 5, cursor: null }, later(93))

    await expect(runs.getLatest(later(94))).resolves.toMatchObject({
      jobs: [{ added: 2, id: youtubeJobId, status: 'done' }, {}, {}],
    })
  })

  it('follows a failed job that is requested again on its own', async () => {
    const { queue, runs } = createRuns()

    await startRun(runs)
    const job = await claimJob(queue, later(1))
    await queue.fail({ ...job, cursor: 'page-2' }, 'error', later(2))

    await queue.enqueue(
      {
        accountId: 'channel-row-1',
        provider: 'youtube',
        requestedBy: 'user-2',
        talentId: 'talent-1',
      },
      later(3),
    )

    await expect(runs.getLatest(later(4))).resolves.toMatchObject({
      counts: { failed: 0, pending: 3 },
      jobs: [{ active: true, error: null, status: 'pending' }, {}, {}],
    })
  })

  it('keeps a finished job as it finished when it is requested again on its own', async () => {
    const { queue, runs } = createRuns()

    await startRun(runs)
    const job = await claimJob(queue, later(1))
    await queue.complete({ ...job, added: 4, cursor: null }, later(2))

    // Starts over from the newest videos, outside the check.
    await queue.enqueue(
      {
        accountId: 'channel-row-1',
        provider: 'youtube',
        requestedBy: 'user-2',
        talentId: 'talent-1',
      },
      later(3),
    )

    await expect(runs.getLatest(later(4))).resolves.toMatchObject({
      added: 4,
      counts: { done: 1, pending: 2 },
      jobs: [{ active: false, added: 4, status: 'done' }, {}, {}],
    })
  })

  it('shows a job that is gone as interrupted', async () => {
    const { redis, runs } = createRuns()

    await startRun(runs)
    redis.values.delete(
      `${REDIS_KEYS.VIDEO_BACKFILL_JOB_PREFIX}${youtubeJobId}`,
    )

    await expect(runs.getLatest(now)).resolves.toMatchObject({
      counts: { interrupted: 1, pending: 2 },
      jobs: [
        { active: false, added: 0, status: 'interrupted', updatedAt: null },
        {},
        {},
      ],
    })
  })
})
