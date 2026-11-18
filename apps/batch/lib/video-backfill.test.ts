import { AccountNotFoundError, type Scraper } from '@shinju-date/scraper'
import type {
  BackfillClaim,
  BackfillJob,
  BackfillQueue,
  BackfillWriteResult,
} from '@shinju-date/video-backfill'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const captureException = vi.fn()
const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }

vi.mock('@sentry/nextjs', () => ({ captureException }))
vi.mock('@shinju-date/logger', () => ({ logger }))

const { BACKFILL_MAX_ATTEMPTS, BACKFILL_SENTRY_TAG, workOffBackfillQueue } =
  await import('./video-backfill')

function createJob(overrides: Partial<BackfillJob> = {}): BackfillJob {
  return {
    accountId: 'channel-row-1',
    added: 0,
    attempts: 0,
    cursor: null,
    error: null,
    finishedAt: null,
    id: 'youtube:channel-row-1',
    pages: 0,
    provider: 'youtube',
    requestedAt: '2026-11-14T00:00:00Z',
    requestedBy: 'user-1',
    startedAt: '2026-11-14T00:01:00Z',
    status: 'running',
    talentId: 'talent-1',
    updatedAt: '2026-11-14T00:01:00Z',
    ...overrides,
  }
}

const lost: BackfillWriteResult = { status: 'lost' }

/** A claim of a job whose job has the given fields. */
function claimOf(fields: Partial<BackfillJob>) {
  return { job: expect.objectContaining(fields), token: expect.any(String) }
}

/**
 * Hands out the given jobs in order and puts requeued jobs at the end, like
 * the Redis queue does. Every write keeps the lock unless a test says
 * otherwise.
 */
function createQueue(jobs: BackfillJob[]) {
  const queued = [...jobs]
  let claims = 0
  const queue = {
    claim: vi.fn(async (): Promise<BackfillClaim | null> => {
      const job = queued.shift()

      return job ? { job, token: `token-${++claims}` } : null
    }),
    complete: vi.fn(
      async ({ job }: BackfillClaim): Promise<BackfillWriteResult> => ({
        job: {
          ...job,
          finishedAt: '2026-11-14T00:05:00Z',
          status: 'done' as const,
        },
        status: 'saved' as const,
      }),
    ),
    fail: vi.fn(
      async (
        { job }: BackfillClaim,
        error: string,
      ): Promise<BackfillWriteResult> => ({
        job: {
          ...job,
          error,
          finishedAt: '2026-11-14T00:05:00Z',
          status: 'failed' as const,
        },
        status: 'saved' as const,
      }),
    ),
    requeue: vi.fn(
      async ({ job }: BackfillClaim): Promise<BackfillWriteResult> => {
        queued.push(job)
        return { job, status: 'saved' as const }
      },
    ),
    update: vi.fn(
      async ({ job }: BackfillClaim): Promise<BackfillWriteResult> => ({
        job,
        status: 'saved' as const,
      }),
    ),
  }

  return { queue, typed: queue as unknown as BackfillQueue }
}

function createScraper() {
  const addPastVideos = vi.fn<Scraper['addPastVideos']>()

  return {
    addPastVideos,
    getScraper: vi.fn(() => ({ addPastVideos }) as unknown as Scraper),
  }
}

const farFuture = Temporal.Now.instant().add({ hours: 1 })

describe('workOffBackfillQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads every page of a job and completes it', async () => {
    const { queue, typed } = createQueue([createJob()])
    const { addPastVideos, getScraper } = createScraper()

    addPastVideos
      .mockResolvedValueOnce({ added: 3, cursor: 'page-2', listed: 50 })
      .mockResolvedValueOnce({ added: 1, cursor: null, listed: 10 })

    await expect(
      workOffBackfillQueue({ deadline: farFuture, getScraper, queue: typed }),
    ).resolves.toEqual({ added: 4, jobs: 1 })

    expect(getScraper).toHaveBeenCalledWith('youtube')
    expect(addPastVideos).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ accountId: 'channel-row-1', cursor: null }),
    )
    expect(addPastVideos).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ cursor: 'page-2' }),
    )
    expect(queue.update).toHaveBeenCalledWith(
      claimOf({ added: 3, cursor: 'page-2', pages: 1 }),
    )
    expect(queue.complete).toHaveBeenCalledWith(
      claimOf({ added: 4, cursor: null, pages: 2 }),
    )
    expect(queue.requeue).not.toHaveBeenCalled()
  })

  it('puts a job back with its cursor when the time is up', async () => {
    const { queue, typed } = createQueue([createJob({ added: 5, pages: 2 })])
    const { addPastVideos, getScraper } = createScraper()
    const start = Temporal.Instant.from('2026-11-14T00:00:00Z')
    const deadline = start.add({ seconds: 50 })
    let now = start

    addPastVideos.mockImplementation(async () => {
      // Reading the page takes the rest of the time.
      now = deadline

      return { added: 2, cursor: 'page-4', listed: 50 }
    })

    await expect(
      workOffBackfillQueue({
        clock: () => now,
        deadline,
        getScraper,
        queue: typed,
      }),
    ).resolves.toEqual({ added: 2, jobs: 1 })

    expect(addPastVideos).toHaveBeenCalledTimes(1)
    expect(queue.requeue).toHaveBeenCalledWith(
      claimOf({ added: 7, cursor: 'page-4', pages: 3 }),
    )
    expect(queue.complete).not.toHaveBeenCalled()
  })

  it('puts a job back with its progress when recording it fails', async () => {
    const { queue, typed } = createQueue([createJob()])
    const { addPastVideos, getScraper } = createScraper()

    addPastVideos.mockResolvedValue({ added: 3, cursor: 'page-2', listed: 50 })
    queue.update.mockRejectedValue(new Error('redis unavailable'))

    await expect(
      workOffBackfillQueue({ deadline: farFuture, getScraper, queue: typed }),
    ).rejects.toThrow('redis unavailable')

    expect(queue.requeue).toHaveBeenCalledWith(
      claimOf({ added: 3, cursor: 'page-2', pages: 1 }),
    )
  })

  it('keeps the original error when putting the job back fails too', async () => {
    const { queue, typed } = createQueue([createJob()])
    const { addPastVideos, getScraper } = createScraper()

    addPastVideos.mockResolvedValue({ added: 0, cursor: 'page-2', listed: 50 })
    queue.update.mockRejectedValue(new Error('redis unavailable'))
    queue.requeue.mockRejectedValue(new Error('still unavailable'))

    await expect(
      workOffBackfillQueue({ deadline: farFuture, getScraper, queue: typed }),
    ).rejects.toThrow('redis unavailable')
  })

  it('takes turns between jobs and works on each at most once per run', async () => {
    const other = createJob({
      accountId: 'twitch-row-1',
      id: 'twitch:twitch-row-1',
      provider: 'twitch',
    })
    const { queue, typed } = createQueue([createJob(), other])
    const { addPastVideos, getScraper } = createScraper()

    addPastVideos.mockRejectedValueOnce(new Error('quota exceeded'))
    addPastVideos.mockResolvedValueOnce({ added: 0, cursor: null, listed: 0 })

    await expect(
      workOffBackfillQueue({ deadline: farFuture, getScraper, queue: typed }),
    ).resolves.toEqual({ added: 0, jobs: 2 })

    expect(getScraper).toHaveBeenCalledWith('twitch')
    // The failed job came around again and was left for the next run.
    expect(addPastVideos).toHaveBeenCalledTimes(2)
    expect(queue.requeue).toHaveBeenCalledTimes(2)
    expect(queue.requeue).toHaveBeenNthCalledWith(
      1,
      claimOf({ attempts: 1, error: 'quota exceeded' }),
    )
  })

  it('gives a job up after repeated failures', async () => {
    const { queue, typed } = createQueue([
      createJob({ attempts: BACKFILL_MAX_ATTEMPTS - 1, cursor: 'page-9' }),
    ])
    const { addPastVideos, getScraper } = createScraper()

    addPastVideos.mockRejectedValue(new Error('quota exceeded'))

    await workOffBackfillQueue({
      deadline: farFuture,
      getScraper,
      queue: typed,
    })

    expect(queue.fail).toHaveBeenCalledWith(
      claimOf({ attempts: BACKFILL_MAX_ATTEMPTS, cursor: 'page-9' }),
      'quota exceeded',
    )
    expect(queue.requeue).not.toHaveBeenCalled()
  })

  it('gives a job up at once when the account is gone', async () => {
    const { queue, typed } = createQueue([createJob()])
    const { addPastVideos, getScraper } = createScraper()

    addPastVideos.mockRejectedValue(new AccountNotFoundError('channel-row-1'))

    await workOffBackfillQueue({
      deadline: farFuture,
      getScraper,
      queue: typed,
    })

    expect(queue.fail).toHaveBeenCalledWith(
      claimOf({ attempts: 1 }),
      'Account not found: channel-row-1',
    )
  })

  it('does nothing while the queue is empty', async () => {
    const { queue, typed } = createQueue([])
    const { getScraper } = createScraper()

    await expect(
      workOffBackfillQueue({ deadline: farFuture, getScraper, queue: typed }),
    ).resolves.toEqual({ added: 0, jobs: 0 })

    expect(queue.claim).toHaveBeenCalledTimes(1)
    expect(getScraper).not.toHaveBeenCalled()
  })

  it('reports the jobs that finish with how they finished', async () => {
    const other = createJob({
      accountId: 'twitch-row-1',
      id: 'twitch:twitch-row-1',
      provider: 'twitch',
    })
    const { typed } = createQueue([createJob(), other])
    const { addPastVideos, getScraper } = createScraper()
    const onFinish = vi.fn()

    addPastVideos
      .mockResolvedValueOnce({ added: 2, cursor: null, listed: 2 })
      .mockRejectedValueOnce(new AccountNotFoundError('twitch-row-1'))

    await workOffBackfillQueue({
      deadline: farFuture,
      getScraper,
      onFinish,
      queue: typed,
    })

    expect(onFinish.mock.calls).toEqual([
      [
        expect.objectContaining({
          added: 2,
          finishedAt: '2026-11-14T00:05:00Z',
          id: 'youtube:channel-row-1',
          status: 'done',
        }),
      ],
      [
        expect.objectContaining({
          error: 'Account not found: twitch-row-1',
          id: 'twitch:twitch-row-1',
          status: 'failed',
        }),
      ],
    ])
  })

  it('does not report jobs that are put back to continue later', async () => {
    const { queue, typed } = createQueue([createJob()])
    const { addPastVideos, getScraper } = createScraper()
    const onFinish = vi.fn()

    addPastVideos.mockRejectedValue(new Error('quota exceeded'))

    await workOffBackfillQueue({
      deadline: farFuture,
      getScraper,
      onFinish,
      queue: typed,
    })

    expect(queue.requeue).toHaveBeenCalled()
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('keeps working when a finished job cannot be reported', async () => {
    const other = createJob({
      accountId: 'twitch-row-1',
      id: 'twitch:twitch-row-1',
      provider: 'twitch',
    })
    const { queue, typed } = createQueue([createJob(), other])
    const { addPastVideos, getScraper } = createScraper()
    const onFinish = vi
      .fn()
      .mockRejectedValueOnce(new Error('database unavailable'))

    addPastVideos.mockResolvedValue({ added: 1, cursor: null, listed: 1 })

    await expect(
      workOffBackfillQueue({
        deadline: farFuture,
        getScraper,
        onFinish,
        queue: typed,
      }),
    ).resolves.toEqual({ added: 2, jobs: 2 })

    expect(queue.complete).toHaveBeenCalledTimes(2)
    expect(onFinish).toHaveBeenCalledTimes(2)
    expect(captureException).toHaveBeenCalledWith(
      new Error('database unavailable'),
      expect.anything(),
    )
  })

  it('tags the error that made a job give up apart from retried ones', async () => {
    const { typed } = createQueue([
      createJob(),
      createJob({
        accountId: 'twitch-row-1',
        attempts: BACKFILL_MAX_ATTEMPTS - 1,
        id: 'twitch:twitch-row-1',
        provider: 'twitch',
      }),
    ])
    const { addPastVideos, getScraper } = createScraper()

    addPastVideos.mockRejectedValue(new Error('quota exceeded'))

    await workOffBackfillQueue({
      deadline: farFuture,
      getScraper,
      queue: typed,
    })

    expect(captureException.mock.calls).toEqual([
      [
        new Error('quota exceeded'),
        expect.objectContaining({
          level: 'warning',
          tags: { [BACKFILL_SENTRY_TAG]: 'retrying', provider: 'youtube' },
        }),
      ],
      [
        new Error('quota exceeded'),
        expect.objectContaining({
          level: 'error',
          tags: { [BACKFILL_SENTRY_TAG]: 'failed', provider: 'twitch' },
        }),
      ],
    ])
  })

  it('stops working on a job whose lock was lost and goes on to the next', async () => {
    const other = createJob({
      accountId: 'twitch-row-1',
      id: 'twitch:twitch-row-1',
      provider: 'twitch',
    })
    const { queue, typed } = createQueue([createJob(), other])
    const { addPastVideos, getScraper } = createScraper()

    addPastVideos
      .mockResolvedValueOnce({ added: 3, cursor: 'page-2', listed: 50 })
      .mockResolvedValueOnce({ added: 1, cursor: null, listed: 1 })
    queue.update.mockResolvedValueOnce(lost)

    await expect(
      workOffBackfillQueue({ deadline: farFuture, getScraper, queue: typed }),
    ).resolves.toEqual({ added: 4, jobs: 2 })

    // The first job was not read further nor put back.
    expect(addPastVideos).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ accountId: 'twitch-row-1' }),
    )
    expect(queue.requeue).not.toHaveBeenCalled()
    expect(queue.complete).toHaveBeenCalledTimes(1)
    expect(queue.complete).toHaveBeenCalledWith(
      claimOf({ id: 'twitch:twitch-row-1' }),
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('ロック'),
      expect.objectContaining({ jobId: 'youtube:channel-row-1' }),
    )
  })

  it('passes the token of the claim to every write', async () => {
    const { queue, typed } = createQueue([createJob()])
    const { addPastVideos, getScraper } = createScraper()

    addPastVideos
      .mockResolvedValueOnce({ added: 3, cursor: 'page-2', listed: 50 })
      .mockResolvedValueOnce({ added: 1, cursor: null, listed: 1 })

    await workOffBackfillQueue({
      deadline: farFuture,
      getScraper,
      queue: typed,
    })

    expect(queue.update).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'token-1' }),
    )
    expect(queue.complete).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'token-1' }),
    )
  })

  it('does not report a job whose lock was lost when it finished', async () => {
    const { queue, typed } = createQueue([
      createJob(),
      createJob({
        accountId: 'twitch-row-1',
        id: 'twitch:twitch-row-1',
        provider: 'twitch',
      }),
    ])
    const { addPastVideos, getScraper } = createScraper()
    const onFinish = vi.fn()

    addPastVideos
      .mockResolvedValueOnce({ added: 1, cursor: null, listed: 1 })
      .mockRejectedValueOnce(new AccountNotFoundError('twitch-row-1'))
    queue.complete.mockResolvedValueOnce(lost)
    queue.fail.mockResolvedValueOnce(lost)

    await workOffBackfillQueue({
      deadline: farFuture,
      getScraper,
      onFinish,
      queue: typed,
    })

    expect(onFinish).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledTimes(2)
  })
})
