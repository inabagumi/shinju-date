import { REDIS_KEYS } from '@shinju-date/constants'
import type { Redis } from '@upstash/redis'
import { Temporal } from 'temporal-polyfill'
import { describe, expect, it } from 'vitest'
import {
  BACKFILL_JOB_TTL_SECONDS,
  BACKFILL_LEASE_SECONDS,
  BackfillQueue,
  type BackfillRequest,
  getBackfillJobId,
} from '../index.js'

/**
 * The subset of Redis the queue uses, kept in memory. Values are stored as
 * they are given, like `@upstash/redis` does with automatic serialization.
 */
class FakeRedis {
  /** Makes the next transaction fail without applying any of its commands. */
  failNextTransaction = false
  readonly lists = new Map<string, unknown[]>()
  readonly ttls = new Map<string, number>()
  readonly values = new Map<string, unknown>()

  async del(...keys: string[]): Promise<number> {
    let count = 0

    for (const key of keys) {
      if (this.values.delete(key) || this.lists.delete(key)) {
        count++
      }
    }

    return count
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.ttls.set(key, seconds)

    return 1
  }

  async get<T>(key: string): Promise<T | null> {
    return (this.values.get(key) as T | undefined) ?? null
  }

  async lpush(key: string, ...elements: unknown[]): Promise<number> {
    const list = this.lists.get(key) ?? []

    list.unshift(...elements.reverse())
    this.lists.set(key, list)

    return list.length
  }

  async mget<T extends unknown[]>(...keys: string[]): Promise<T> {
    return keys.map((key) => this.values.get(key) ?? null) as T
  }

  /** Commands queued in a transaction run together, or not at all. */
  multi() {
    const commands: (() => Promise<unknown>)[] = []
    const transaction = {
      del: (...keys: string[]) => {
        commands.push(() => this.del(...keys))
        return transaction
      },
      exec: async () => {
        if (this.failNextTransaction) {
          this.failNextTransaction = false
          throw new Error('transaction failed')
        }

        const results: unknown[] = []

        for (const command of commands) {
          results.push(await command())
        }

        return results
      },
      expire: (key: string, seconds: number) => {
        commands.push(() => this.expire(key, seconds))
        return transaction
      },
      lpush: (key: string, ...elements: unknown[]) => {
        commands.push(() => this.lpush(key, ...elements))
        return transaction
      },
      set: (
        key: string,
        value: unknown,
        options?: { ex?: number; nx?: boolean },
      ) => {
        commands.push(() => this.set(key, value, options))
        return transaction
      },
    }

    return transaction
  }

  async rpop<T>(key: string): Promise<T | null> {
    return (this.lists.get(key)?.pop() as T | undefined) ?? null
  }

  async set(
    key: string,
    value: unknown,
    options: { ex?: number; nx?: boolean } = {},
  ): Promise<'OK' | null> {
    if (options.nx && this.values.has(key)) {
      return null
    }

    this.values.set(key, value)

    if (options.ex !== undefined) {
      this.ttls.set(key, options.ex)
    }

    return 'OK'
  }
}

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

  it('refuses a request while another one for the account is handled', async () => {
    const { queue, redis } = createQueue()

    // Another request holds the account right now.
    await redis.set(
      `${REDIS_KEYS.VIDEO_BACKFILL_ENQUEUE_LOCK_PREFIX}${jobId}`,
      'other',
    )

    await expect(queue.enqueue(request, now)).resolves.toEqual({
      enqueued: false,
      job: null,
    })
    expect(redis.lists.get(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)).toBeUndefined()
  })

  it('handles requests for the same account at the same moment once', async () => {
    const { queue, redis } = createQueue()

    const results = await Promise.all([
      queue.enqueue(request, now),
      queue.enqueue({ ...request, requestedBy: 'user-2' }, now),
    ])

    expect(results.filter((result) => result.enqueued)).toHaveLength(1)
    expect(redis.lists.get(REDIS_KEYS.VIDEO_BACKFILL_QUEUE)).toEqual([jobId])
    expect(
      redis.values.has(
        `${REDIS_KEYS.VIDEO_BACKFILL_ENQUEUE_LOCK_PREFIX}${jobId}`,
      ),
    ).toBe(false)
  })

  it('leaves no pending job behind when queueing it fails', async () => {
    const { queue, redis } = createQueue()

    redis.failNextTransaction = true

    await expect(queue.enqueue(request, now)).rejects.toThrow(
      'transaction failed',
    )
    await expect(queue.getJobs([jobId], now)).resolves.toEqual([null])
    // The request can be made again right away.
    await expect(queue.enqueue(request, now)).resolves.toMatchObject({
      enqueued: true,
    })
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
})
