import {
  BACKFILL_LEASE_MARGIN_SECONDS,
  type BackfillQueue,
  getRunResultKey,
} from '@shinju-date/video-backfill'
import { FakeRedis } from '@shinju-date/video-backfill/testing'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const acquireLock = vi.fn()
const limit = vi.fn()
const createScraper = vi.fn(() => ({ provider: 'youtube' }))
const revalidateTags = vi.fn()
const workOffBackfillQueue = vi.fn()
const recordBackfillJob = vi.fn()
const supabaseClient = { from: vi.fn() }
const redisClient = new FakeRedis()

vi.mock('@/lib/lock', () => ({ acquireLock }))
vi.mock('@/lib/ratelimit', () => ({ videosBackfill: { limit } }))
vi.mock('@/lib/redis', () => ({ redisClient }))
vi.mock('@/lib/scraper', () => ({ createScraper }))
vi.mock('@/lib/supabase', () => ({ supabaseClient }))
vi.mock('@/lib/video-backfill', () => ({ workOffBackfillQueue }))
vi.mock('@/lib/video-backfill-history', () => ({ recordBackfillJob }))
vi.mock('@shinju-date/web-cache', () => ({ revalidateTags }))

vi.mock('@shinju-date/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

vi.mock('@sentry/nextjs', () => ({
  captureCheckIn: vi.fn(() => 'check-in-id'),
  captureException: vi.fn(),
  flush: vi.fn(),
}))

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: vi.fn((callback: () => unknown) => callback()),
}))

const { POST, maxDuration } = await import('./route')

function createRequest(): NextRequest {
  return new NextRequest('http://localhost:5000/videos/backfill', {
    method: 'POST',
  })
}

describe('POST /videos/backfill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    limit.mockResolvedValue({ success: true })
    workOffBackfillQueue.mockResolvedValue({ added: 0, jobs: 0 })
  })

  it('works off the queue with its own rate limit', async () => {
    const response = await POST(createRequest())

    expect(response.status).toBe(204)
    expect(limit).toHaveBeenCalledWith('videos:backfill')
    // Runs overlap on purpose; each job of the queue has its own lock.
    expect(acquireLock).not.toHaveBeenCalled()
    expect(workOffBackfillQueue).toHaveBeenCalledTimes(1)
    expect(revalidateTags).not.toHaveBeenCalled()
  })

  it('creates one scraper per provider', async () => {
    await POST(createRequest())

    const [{ getScraper }] = workOffBackfillQueue.mock.calls[0] ?? []

    expect(getScraper('youtube')).toBe(getScraper('youtube'))
    getScraper('twitch')
    expect(createScraper.mock.calls).toEqual([['youtube'], ['twitch']])
  })

  it('locks each job for as long as the run may last', async () => {
    await POST(createRequest())

    const [{ queue }] = workOffBackfillQueue.mock.calls[0] ?? []

    expect(queue.leaseSeconds).toBe(maxDuration + BACKFILL_LEASE_MARGIN_SECONDS)
  })

  it('records the jobs that finish in the history', async () => {
    await POST(createRequest())

    const [{ onFinish }] = workOffBackfillQueue.mock.calls[0] ?? []
    const job = { id: 'youtube:channel-row-1', status: 'done' }

    await onFinish(job)

    expect(recordBackfillJob).toHaveBeenCalledWith(supabaseClient, job)
  })

  it('keeps the outcome of a job of a check when it finishes', async () => {
    await POST(createRequest())

    const queue: BackfillQueue = workOffBackfillQueue.mock.calls[0]?.[0].queue

    await queue.enqueue({
      accountId: 'channel-row-1',
      provider: 'youtube',
      requestedBy: null,
      runId: 'run-1',
      talentId: 'talent-1',
    })

    const claimed = await queue.claim()

    if (!claimed) {
      throw new Error('Expected a job to claim')
    }

    const finished = await queue.recordPage(claimed, {
      added: 0,
      done: true,
      nextCursor: null,
    })

    expect(finished.status).toBe('saved')
    await expect(
      redisClient.get(getRunResultKey('run-1', claimed.job.id)),
    ).resolves.toEqual(finished.status === 'saved' && finished.job)
  })

  it('refreshes the public site after videos were added', async () => {
    workOffBackfillQueue.mockResolvedValue({ added: 3, jobs: 1 })

    await POST(createRequest())

    expect(revalidateTags).toHaveBeenCalledWith(['videos'], expect.anything())
  })

  it('does not run again right after the previous run', async () => {
    limit.mockResolvedValue({ success: false })

    const response = await POST(createRequest())

    expect(response.status).toBe(429)
    expect(workOffBackfillQueue).not.toHaveBeenCalled()
  })

  it('reports a run that fails', async () => {
    workOffBackfillQueue.mockRejectedValue(new Error('redis unavailable'))

    const response = await POST(createRequest())

    expect(response.status).toBe(500)
  })
})
