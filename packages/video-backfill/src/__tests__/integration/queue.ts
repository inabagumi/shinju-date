import { REDIS_KEYS } from '@shinju-date/constants'
import type { Redis } from '@upstash/redis'
import { describe, expect, it } from 'vitest'
import {
  BACKFILL_JOB_TTL_SECONDS,
  BACKFILL_LEASE_SECONDS,
  BackfillQueue,
  type BackfillRequest,
  getBackfillJobId,
  getRunResultKey,
} from '../index.js'
import { FakeRedis } from './fake-redis.js'

const now = Temporal.Instant.from('2026-11-14T00:00:00Z')
const later = (minutes: number) => now.add({ minutes })

const request: BackfillRequest = {
  accountId: 'channel-row-1',
  provider: 'youtube',
  requestedBy: 'user-1',
  talentId: 'talent-1',
}
const jobId = getBackfillJobId('youtube', 'channel-row-1')
const lockKey = `${REDIS_KEYS.VIDEO_BACKFILL_LOCK_PREFIX}${jobId}`

/** Claims the next job, failing the test when there is none. */
async function claimJob(queue: BackfillQueue, at: Temporal.Instant) {
  const job = await queue.claim(at)

  if (!job) {
    throw new Error('Expected a job to claim')
  }

  return job
}

function createQueue() {
  const redis = new FakeRedis()

  return { queue: new BackfillQueue(redis as unknown as Redis), redis }
}

describe('getBackfillJobId', () => {
  it('identifies a job by platform and account', () => {
    expect(jobId).toBe('youtube:channel-row-1')
  })
})

describe('BackfillQueue', () => {
  it('queues a job and keeps it for a week', async () => {
    const { queue, redis } = createQueue()

    await expect(queue.enqueue(request, now)).resolves.toEqual({
      enqueued: true,
      job: expect.objectContaining({
        added: 0,
        cursor: null,
        id: jobId,
        requestedAt: now.toString(),
        requestedBy: 'user-1',
        status: 'pending',
        talentId: 'talent-1',
      }),
    })

    expect(redis.lists.get(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)).toEqual([jobId])
    expect(
      redis.ttls.get(`${REDIS_KEYS.VIDEO_BACKFILL_JOB_PREFIX}${jobId}`),
    ).toBe(BACKFILL_JOB_TTL_SECONDS)
    expect(redis.ttls.get(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)).toBe(
      BACKFILL_JOB_TTL_SECONDS,
    )
  })

  it('refuses a second request while the job is queued', async () => {
    const { queue, redis } = createQueue()

    await queue.enqueue(request, now)

    await expect(queue.enqueue(request, later(1))).resolves.toMatchObject({
      enqueued: false,
      job: { status: 'pending' },
    })
    expect(redis.lists.get(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)).toHaveLength(1)
  })

  it('handles requests for the same account at the same moment once', async () => {
    const { queue, redis } = createQueue()

    const results = await Promise.all([
      queue.enqueue(request, now),
      queue.enqueue({ ...request, requestedBy: 'user-2' }, now),
    ])

    expect(results.filter((result) => result.enqueued)).toHaveLength(1)
    expect(redis.lists.get(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)).toEqual([jobId])
  })

  it('does not save over progress made after the request read the job', async () => {
    const { queue, redis } = createQueue()

    // The request stalls after reading; meanwhile another request queues the
    // job and a worker reads a page of it.
    redis.beforeNextScript = async () => {
      await queue.enqueue({ ...request, requestedBy: 'user-2' }, now)
      const job = await claimJob(queue, later(1))
      await queue.requeue({ ...job, added: 4, cursor: 'page-2' }, later(2))
    }

    await expect(queue.enqueue(request, later(3))).resolves.toMatchObject({
      enqueued: false,
      job: { added: 4, cursor: 'page-2', requestedBy: 'user-2' },
    })
    expect(redis.lists.get(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)).toEqual([jobId])
  })

  it('does not queue a job that a worker claimed after it was read', async () => {
    const { queue, redis } = createQueue()

    await queue.enqueue(request, now)
    const job = await claimJob(queue, later(1))
    await queue.fail(job, 'quota exceeded', later(2))

    // A stale queue entry is claimed between the request's read and write.
    redis.beforeNextScript = async () => {
      await redis.set(lockKey, 'worker')
    }

    await expect(queue.enqueue(request, later(3))).resolves.toMatchObject({
      enqueued: false,
      job: { status: 'failed' },
    })
    expect(redis.lists.get(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)).toEqual([])
  })

  it('saves nothing when the job cannot be added to the queue', async () => {
    const { queue, redis } = createQueue()

    redis.lpushFails = true

    await expect(queue.enqueue(request, now)).rejects.toThrow('WRONGTYPE')
    await expect(queue.getJobs([jobId], now)).resolves.toEqual([null])

    // Once the queue works again, the request can be made right away.
    redis.lpushFails = false

    await expect(queue.enqueue(request, now)).resolves.toMatchObject({
      enqueued: true,
    })
  })

  it('keeps a job claimed when it cannot be put back in the queue', async () => {
    const { queue, redis } = createQueue()

    await queue.enqueue(request, now)
    const job = await claimJob(queue, later(1))

    redis.lpushFails = true

    await expect(queue.requeue({ ...job, cursor: 'page-2' })).rejects.toThrow(
      'WRONGTYPE',
    )
    // Not left pending without a queue entry: still running and locked, and
    // free to be requested again once the lease runs out.
    await expect(queue.getJobs([jobId], later(2))).resolves.toEqual([
      {
        active: true,
        job: expect.objectContaining({ cursor: null, status: 'running' }),
      },
    ])
  })

  it('refuses a second request while the job is being read', async () => {
    const { queue } = createQueue()

    await queue.enqueue(request, now)
    await queue.claim(later(1))

    await expect(queue.enqueue(request, later(2))).resolves.toMatchObject({
      enqueued: false,
      job: { status: 'running' },
    })
  })

  it('claims jobs in the order they were queued and locks them', async () => {
    const { queue, redis } = createQueue()

    await queue.enqueue(request, now)
    await queue.enqueue({ ...request, accountId: 'channel-row-2' }, now)

    await expect(queue.claim(later(1))).resolves.toMatchObject({
      id: jobId,
      startedAt: later(1).toString(),
      status: 'running',
    })
    expect(redis.ttls.get(lockKey)).toBe(BACKFILL_LEASE_SECONDS)
    await expect(queue.claim(later(1))).resolves.toMatchObject({
      id: 'youtube:channel-row-2',
    })
    await expect(queue.claim(later(1))).resolves.toBeNull()
  })

  it('does not hand out a job that is locked by another worker', async () => {
    const { queue, redis } = createQueue()

    await queue.enqueue(request, now)
    // Queued a second time, e.g. by two requests at the same moment.
    await redis.lpush(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, jobId)

    await expect(queue.claim(later(1))).resolves.toMatchObject({ id: jobId })
    await expect(queue.claim(later(1))).resolves.toBeNull()
  })

  it('skips queue entries of jobs that are finished or gone', async () => {
    const { queue, redis } = createQueue()

    await queue.enqueue(request, now)
    const job = await claimJob(queue, later(1))
    await queue.complete(job, later(2))
    await redis.lpush(REDIS_KEYS.VIDEO_BACKFILL_QUEUE, jobId, 'youtube:gone')

    await expect(queue.claim(later(3))).resolves.toBeNull()
    expect(redis.values.has(lockKey)).toBe(false)
  })

  it('puts a job back at the end of the queue to continue later', async () => {
    const { queue, redis } = createQueue()

    await queue.enqueue(request, now)
    await queue.enqueue({ ...request, accountId: 'channel-row-2' }, now)
    const job = await claimJob(queue, later(1))

    await queue.requeue(
      { ...job, added: 3, cursor: 'page-2', pages: 1 },
      later(2),
    )

    expect(redis.values.has(lockKey)).toBe(false)
    expect(redis.lists.get(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)).toEqual([
      jobId,
      'youtube:channel-row-2',
    ])
    await expect(queue.getJobs([jobId], later(2))).resolves.toEqual([
      {
        active: true,
        job: expect.objectContaining({
          added: 3,
          cursor: 'page-2',
          status: 'pending',
        }),
      },
    ])
  })

  it('records progress and the outcome', async () => {
    const { queue, redis } = createQueue()

    await queue.enqueue(request, now)
    const job = await claimJob(queue, later(1))
    await queue.update({ ...job, added: 2, pages: 1 }, later(2))
    const failed = await queue.fail(
      { ...job, added: 2, pages: 1 },
      'quota exceeded',
      later(3),
    )

    expect(failed).toMatchObject({
      added: 2,
      error: 'quota exceeded',
      finishedAt: later(3).toString(),
      status: 'failed',
    })
    expect(redis.values.has(lockKey)).toBe(false)
    await expect(queue.getJobs([jobId, 'twitch:none'])).resolves.toEqual([
      { active: false, job: failed },
      null,
    ])
  })

  it('resumes a failed job where it stopped', async () => {
    const { queue } = createQueue()

    await queue.enqueue(request, now)
    const job = await claimJob(queue, later(1))
    await queue.fail({ ...job, added: 5, cursor: 'page-3' }, 'error')

    await expect(
      queue.enqueue({ ...request, requestedBy: 'user-2' }, later(5)),
    ).resolves.toMatchObject({
      enqueued: true,
      job: {
        added: 5,
        cursor: 'page-3',
        error: null,
        requestedBy: 'user-2',
        status: 'pending',
      },
    })
  })

  it('starts a job that is done over from the newest videos', async () => {
    const { queue } = createQueue()

    await queue.enqueue(request, now)
    const job = await claimJob(queue, later(1))
    await queue.complete({ ...job, added: 5, cursor: null, pages: 4 })

    await expect(queue.enqueue(request, later(5))).resolves.toMatchObject({
      enqueued: true,
      job: { added: 0, cursor: null, pages: 0, status: 'pending' },
    })
  })

  it('lets a job whose worker died be requested again', async () => {
    const { queue, redis } = createQueue()

    await queue.enqueue(request, now)
    await queue.claim(later(1))
    // The lease ran out.
    redis.values.delete(lockKey)

    await expect(queue.getJobs([jobId], later(10))).resolves.toEqual([
      { active: false, job: expect.objectContaining({ status: 'running' }) },
    ])
    await expect(queue.enqueue(request, later(10))).resolves.toMatchObject({
      enqueued: true,
    })
  })

  it('lets a job that waited too long in the queue be requested again', async () => {
    const { queue } = createQueue()

    await queue.enqueue(request, now)

    await expect(queue.getJobs([jobId], later(59))).resolves.toEqual([
      expect.objectContaining({ active: true }),
    ])
    await expect(queue.getJobs([jobId], later(61))).resolves.toEqual([
      expect.objectContaining({ active: false }),
    ])
  })

  it('keeps the check a resumed job belongs to unless a new one is given', async () => {
    const { queue } = createQueue()

    await queue.enqueue({ ...request, runId: 'run-1' }, now)
    const job = await claimJob(queue, later(1))
    await queue.fail({ ...job, cursor: 'page-3' }, 'error')

    await expect(queue.enqueue(request, later(5))).resolves.toMatchObject({
      job: { cursor: 'page-3', runId: 'run-1' },
    })

    const resumed = await claimJob(queue, later(6))
    await queue.fail(resumed, 'error')

    await expect(
      queue.enqueue({ ...request, runId: 'run-2' }, later(10)),
    ).resolves.toMatchObject({ job: { runId: 'run-2' } })
  })

  it('does not carry the check over when a job that is done starts over', async () => {
    const { queue } = createQueue()

    await queue.enqueue({ ...request, runId: 'run-1' }, now)
    await queue.complete(await claimJob(queue, later(1)))

    await expect(queue.enqueue(request, later(5))).resolves.toMatchObject({
      job: { runId: null },
    })
  })

  it('keeps the outcome of a job of a check when it finishes', async () => {
    const { queue, redis } = createQueue()

    await queue.enqueue({ ...request, runId: 'run-1' }, now)
    const done = await queue.complete(
      { ...(await claimJob(queue, later(1))), added: 3 },
      later(2),
    )
    const resultKey = getRunResultKey('run-1', jobId)

    expect(redis.values.get(resultKey)).toEqual(done)
    expect(redis.ttls.get(resultKey)).toBe(BACKFILL_JOB_TTL_SECONDS)
  })

  it('keeps no outcome for a job without a check', async () => {
    const { queue, redis } = createQueue()

    await queue.enqueue(request, now)
    await queue.complete(await claimJob(queue, later(1)))

    expect(
      [...redis.values.keys()].filter((key) =>
        key.startsWith(REDIS_KEYS.VIDEO_BACKFILL_RUN_RESULT_PREFIX),
      ),
    ).toEqual([])
  })
})
