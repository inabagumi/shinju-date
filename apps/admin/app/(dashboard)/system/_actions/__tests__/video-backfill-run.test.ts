import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAuditLog: vi.fn(),
  getLatest: vi.fn(),
  order: vi.fn(),
  start: vi.fn(),
}))

vi.mock('@/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  requireAuthenticatedUser: vi.fn(async () => ({
    supabaseClient: {
      from: vi.fn(() => {
        const query = {
          is: vi.fn(() => query),
          order: mocks.order,
          select: vi.fn(() => query),
        }

        return query
      }),
    },
    user: { id: 'user-1' },
  })),
}))
vi.mock('@/lib/redis', () => ({ getRedisClient: vi.fn(() => ({})) }))
vi.mock('@/lib/audit-log', () => ({ createAuditLog: mocks.createAuditLog }))
vi.mock('@shinju-date/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}))
vi.mock('@shinju-date/video-backfill', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shinju-date/video-backfill')>()),
  BackfillRuns: class {
    getLatest = mocks.getLatest
    start = mocks.start
  },
}))

const { getVideoBackfillRunAction, requestVideoBackfillRunAction } =
  await import('../video-backfill-run')

const runId = '123e4567-e89b-12d3-a456-426614174000'
const talents = [
  {
    id: 'talent-1',
    name: 'Alice',
    status: 'active',
    twitch_users: [
      {
        id: 'twitch-row-1',
        name: null,
        twitch_login_name: 'alice',
        twitch_user_id: '1001',
      },
    ],
    youtube_channels: [
      { id: 'channel-row-1', name: 'Main', youtube_channel_id: 'UCaaa' },
    ],
  },
  {
    id: 'talent-2',
    name: 'Bob',
    status: 'retired',
    twitch_users: [],
    youtube_channels: [
      { id: 'channel-row-2', name: null, youtube_channel_id: 'UCbbb' },
    ],
  },
]
const run = {
  failed: 0,
  id: runId,
  jobs: [
    {
      accountId: 'channel-row-1',
      addedBefore: 0,
      id: 'youtube:channel-row-1',
      provider: 'youtube',
      talentId: 'talent-1',
    },
    {
      accountId: 'twitch-row-1',
      addedBefore: 0,
      id: 'twitch:twitch-row-1',
      provider: 'twitch',
      talentId: 'talent-1',
    },
  ],
  requestedAt: '2026-11-14T00:00:00Z',
  requestedBy: 'user-1',
  skipped: 0,
}

describe('requestVideoBackfillRunAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.order.mockResolvedValue({ data: talents, error: null })
    mocks.start.mockResolvedValue({
      failed: 0,
      run,
      skipped: 0,
      status: 'started',
    })
  })

  it('queues the accounts of active talents and records who asked', async () => {
    await expect(requestVideoBackfillRunAction()).resolves.toEqual({
      message: '全タレントの取得漏れチェックを2件キューに追加しました。',
      success: true,
    })

    expect(mocks.start).toHaveBeenCalledExactlyOnceWith(
      [
        expect.objectContaining({
          accountId: 'channel-row-1',
          provider: 'youtube',
          talentId: 'talent-1',
        }),
        expect.objectContaining({
          accountId: 'twitch-row-1',
          provider: 'twitch',
          talentId: 'talent-1',
        }),
      ],
      expect.objectContaining({ requestedBy: 'user-1' }),
    )
    expect(mocks.createAuditLog).toHaveBeenCalledExactlyOnceWith(
      'VIDEO_BACKFILL',
      'redis:video-backfill',
      runId,
      {
        accounts: 2,
        entityName: '全タレントの取得漏れチェック（2件）',
        failed: 0,
        scope: 'all',
        skipped: 0,
        targets: { twitch: 1, youtube: 1 },
      },
    )
  })

  it('refuses while the latest check is in progress', async () => {
    mocks.start.mockResolvedValue({ progress: {}, status: 'active' })

    await expect(requestVideoBackfillRunAction()).resolves.toEqual({
      error: '全タレントの取得漏れチェックは既に実行中です。',
      success: false,
    })
    expect(mocks.createAuditLog).not.toHaveBeenCalled()
  })

  it('refuses while another request is being handled', async () => {
    mocks.start.mockResolvedValue({ status: 'busy' })

    await expect(requestVideoBackfillRunAction()).resolves.toMatchObject({
      error: expect.stringContaining(
        '別の取得漏れチェックの依頼を処理しています',
      ),
      success: false,
    })
    expect(mocks.createAuditLog).not.toHaveBeenCalled()
  })

  it('reports when every account is being backfilled already', async () => {
    mocks.start.mockResolvedValue({ failed: 0, skipped: 2, status: 'empty' })

    await expect(requestVideoBackfillRunAction()).resolves.toEqual({
      error: 'すべてのアカウントで過去動画の取り込みが実行中です。',
      success: false,
    })
    expect(mocks.createAuditLog).not.toHaveBeenCalled()
  })

  it('reports the accounts that were skipped or could not be queued', async () => {
    mocks.start.mockImplementation(async (requests, { onError }) => {
      onError(requests[1], new Error('redis unavailable'))

      return { failed: 1, run, skipped: 3, status: 'started' }
    })

    await expect(requestVideoBackfillRunAction()).resolves.toEqual({
      error:
        '全タレントの取得漏れチェックを2件キューに追加しました（実行中の3件は除く、1件は追加できませんでした: redis unavailable）。',
      success: false,
    })
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      'VIDEO_BACKFILL',
      'redis:video-backfill',
      runId,
      expect.objectContaining({ failed: 1, skipped: 3 }),
    )
  })

  it('reports a failure without an audit log when nothing was queued', async () => {
    mocks.start.mockImplementation(async (requests, { onError }) => {
      onError(requests[0], new Error('redis unavailable'))

      return { failed: 2, skipped: 0, status: 'empty' }
    })

    await expect(requestVideoBackfillRunAction()).resolves.toEqual({
      error:
        '取得漏れチェックをキューに追加できませんでした（redis unavailable）。',
      success: false,
    })
    expect(mocks.createAuditLog).not.toHaveBeenCalled()
  })

  it('rejects when no active talent has an account', async () => {
    mocks.order.mockResolvedValue({ data: [talents[1]], error: null })

    await expect(requestVideoBackfillRunAction()).resolves.toEqual({
      error: 'active なタレントに紐づくアカウントはありません。',
      success: false,
    })
    expect(mocks.start).not.toHaveBeenCalled()
  })

  it('reports a database error', async () => {
    mocks.order.mockResolvedValue({
      data: null,
      error: new Error('database unavailable'),
    })

    await expect(requestVideoBackfillRunAction()).resolves.toEqual({
      error: 'database unavailable',
      success: false,
    })
    expect(mocks.start).not.toHaveBeenCalled()
  })
})

describe('getVideoBackfillRunAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.order.mockResolvedValue({ data: talents, error: null })
  })

  it('returns the targets without a check', async () => {
    mocks.getLatest.mockResolvedValue(null)

    await expect(getVideoBackfillRunAction()).resolves.toEqual({
      run: null,
      success: true,
      targets: { twitch: 1, youtube: 1 },
    })
  })

  it('returns the progress of the latest check with account names', async () => {
    mocks.getLatest.mockResolvedValue({
      active: true,
      added: 5,
      counts: { done: 1, failed: 0, interrupted: 0, pending: 0, running: 2 },
      jobs: [
        {
          ...run.jobs[0],
          active: true,
          added: 5,
          error: null,
          status: 'running',
          updatedAt: '2026-11-14T00:02:00Z',
        },
        {
          ...run.jobs[1],
          active: false,
          added: 0,
          error: null,
          status: 'done',
          updatedAt: '2026-11-14T00:01:00Z',
        },
        // An account that was removed since.
        {
          accountId: 'channel-row-9',
          active: true,
          added: 0,
          addedBefore: 0,
          error: null,
          id: 'youtube:channel-row-9',
          provider: 'youtube',
          status: 'running',
          talentId: 'talent-9',
          updatedAt: null,
        },
      ],
      run: { ...run, skipped: 1 },
    })

    const result = await getVideoBackfillRunAction()

    expect(result.run).toMatchObject({
      active: true,
      added: 5,
      counts: { done: 1, running: 2 },
      id: runId,
      requestedAt: '2026-11-14T00:00:00Z',
      skipped: 1,
    })
    expect(result.run?.accounts).toEqual([
      expect.objectContaining({
        accountId: 'channel-row-1',
        added: 5,
        name: 'Main',
        talentName: 'Alice',
      }),
      expect.objectContaining({
        accountId: 'twitch-row-1',
        name: 'alice',
        status: 'done',
        talentName: 'Alice',
      }),
      expect.objectContaining({
        accountId: 'channel-row-9',
        name: null,
        talentName: null,
      }),
    ])
  })
})
