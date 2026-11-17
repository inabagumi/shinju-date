import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { setupActionTest } from '@/test/action-harness'
import {
  getVideoBackfillHistoryAction,
  retryFailedVideoBackfillJobsAction,
} from '../video-backfill-history'

const mocks = vi.hoisted(() => ({
  enqueue: vi.fn(),
  getJobs: vi.fn(),
}))

vi.mock('@shinju-date/video-backfill', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shinju-date/video-backfill')>()),
  BackfillQueue: class {
    enqueue = mocks.enqueue
    getJobs = mocks.getJobs
  },
}))

const test = setupActionTest()
const { supabase } = test

/** `auth.admin.getUserById()` of the service role client. */
const getUserById = vi.spyOn(supabase.client.auth.admin, 'getUserById')

beforeEach(() => {
  test.signIn({ id: 'user-1' })
})

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

const history = [
  {
    account_id: 'channel-row-1',
    added: 12,
    error: null,
    finished_at: '2026-11-14T02:00:00+00:00',
    id: 'history-1',
    pages: 3,
    platform: 'youtube',
    requested_at: '2026-11-14T01:00:00+00:00',
    requested_by: 'user-1',
    run_id: 'run-1',
    status: 'done',
    talent_id: 'talent-1',
    talents: { name: 'Alice' },
  },
  {
    account_id: 'channel-row-gone',
    added: 0,
    error: 'Account not found: channel-row-gone',
    finished_at: '2026-11-13T02:00:00+00:00',
    id: 'history-2',
    pages: 0,
    platform: 'youtube',
    requested_at: '2026-11-13T01:00:00+00:00',
    requested_by: 'user-gone',
    run_id: null,
    status: 'failed',
    talent_id: 'talent-1',
    talents: { name: 'Alice' },
  },
]

const latestFailures = [
  {
    account_id: 'twitch-row-1',
    error: 'quota exceeded',
    finished_at: '2026-11-14T03:00:00+00:00',
    platform: 'twitch',
  },
  {
    account_id: 'channel-row-2',
    error: 'quota exceeded',
    finished_at: '2026-11-14T01:00:00+00:00',
    platform: 'youtube',
  },
]

function job(id: string) {
  return { added: 0, id, status: 'pending' }
}

describe('getVideoBackfillHistoryAction', () => {
  beforeEach(() => {
    supabase.on('select', 'talents', talents)
    supabase.on('select', 'video_backfill_jobs', history)
    supabase.on('select', 'video_backfill_latest_jobs', latestFailures)
    getUserById.mockImplementation(
      async (id: string) =>
        (id === 'user-1'
          ? { data: { user: { email: 'admin@example.com' } }, error: null }
          : {
              data: { user: null },
              error: { message: 'User not found' },
            }) as Awaited<ReturnType<typeof getUserById>>,
    )
    mocks.getJobs.mockResolvedValue([
      { active: true, job: job('twitch:twitch-row-1') },
      null,
    ])
  })

  it('returns the history with names and who requested each job', async () => {
    const result = await getVideoBackfillHistoryAction()

    expect(result.success).toBe(true)
    expect(result).toHaveProperty('entries', [
      {
        accountId: 'channel-row-1',
        added: 12,
        error: null,
        finishedAt: '2026-11-14T02:00:00+00:00',
        id: 'history-1',
        name: 'Main',
        pages: 3,
        provider: 'youtube',
        requestedAt: '2026-11-14T01:00:00+00:00',
        requester: 'admin@example.com',
        scope: 'all',
        status: 'done',
        talentId: 'talent-1',
        talentName: 'Alice',
      },
      expect.objectContaining({
        error: 'Account not found: channel-row-gone',
        name: null,
        requester: null,
        scope: 'single',
        status: 'failed',
      }),
    ])
  })

  it('returns the accounts whose latest job failed and which are retried', async () => {
    const result = await getVideoBackfillHistoryAction()

    expect(mocks.getJobs).toHaveBeenCalledWith([
      'twitch:twitch-row-1',
      'youtube:channel-row-2',
    ])
    expect(result).toHaveProperty('failures', [
      {
        accountId: 'twitch-row-1',
        active: true,
        error: 'quota exceeded',
        finishedAt: '2026-11-14T03:00:00+00:00',
        name: 'alice',
        provider: 'twitch',
        talentId: 'talent-1',
        talentName: 'Alice',
      },
      expect.objectContaining({
        accountId: 'channel-row-2',
        active: false,
        name: 'UCbbb',
        talentName: 'Bob',
      }),
    ])
  })

  it('still returns the history when the queue cannot be read', async () => {
    mocks.getJobs.mockRejectedValue(new Error('redis unavailable'))

    const result = await getVideoBackfillHistoryAction()

    expect(result).toMatchObject({
      failures: [{ active: false }, { active: false }],
      success: true,
    })
  })

  it('reports a history that cannot be loaded', async () => {
    // supabase-js returns a PostgREST error as a plain object, so throw an
    // `Error` from the client to reach the message.
    const from = supabase.client.from.bind(supabase.client)
    const spy = vi.spyOn(supabase.client, 'from').mockImplementation(((
      table: string,
    ) => {
      if (table === 'video_backfill_jobs') {
        throw new Error('permission denied')
      }

      return from(table as 'talents')
    }) as typeof from)
    onTestFinished(() => spy.mockRestore())

    await expect(getVideoBackfillHistoryAction()).resolves.toEqual({
      error: 'permission denied',
      success: false,
    })
  })
})

describe('retryFailedVideoBackfillJobsAction', () => {
  beforeEach(() => {
    supabase.on('select', 'talents', talents)
    supabase.on('select', 'video_backfill_latest_jobs', latestFailures)
    mocks.enqueue.mockImplementation(
      async ({
        accountId,
        provider,
      }: {
        accountId: string
        provider: string
      }) => ({
        enqueued: true,
        job: job(`${provider}:${accountId}`),
      }),
    )
  })

  it('queues every account whose latest job failed and records who asked', async () => {
    await expect(retryFailedVideoBackfillJobsAction()).resolves.toEqual({
      message: '失敗した過去動画の取り込みを2件キューに追加しました。',
      success: true,
    })

    expect(mocks.enqueue.mock.calls).toEqual([
      [
        {
          accountId: 'twitch-row-1',
          provider: 'twitch',
          requestedBy: 'user-1',
          talentId: 'talent-1',
        },
      ],
      [
        {
          accountId: 'channel-row-2',
          provider: 'youtube',
          requestedBy: 'user-1',
          talentId: 'talent-2',
        },
      ],
    ])
    expect(test.createAuditLog).toHaveBeenCalledExactlyOnceWith(
      supabase.client,
      'VIDEO_BACKFILL',
      null,
      expect.objectContaining({
        accounts: [
          expect.objectContaining({ accountId: 'twitch-row-1' }),
          expect.objectContaining({ accountId: 'channel-row-2' }),
        ],
        scope: 'retry',
        skipped: 0,
      }),
    )
  })

  it('leaves out the accounts that are retried already', async () => {
    mocks.enqueue.mockResolvedValueOnce({
      enqueued: false,
      job: job('twitch:twitch-row-1'),
    })

    await expect(retryFailedVideoBackfillJobsAction()).resolves.toEqual({
      message:
        '失敗した過去動画の取り込みを1件キューに追加しました（再試行中の1件は除く）。',
      success: true,
    })
  })

  it('does nothing while every failed account is retried already', async () => {
    mocks.enqueue.mockResolvedValue({ enqueued: false, job: null })

    await expect(retryFailedVideoBackfillJobsAction()).resolves.toEqual({
      error: '失敗した過去動画の取り込みは、すべて再試行中です。',
      success: false,
    })
    expect(test.createAuditLog).not.toHaveBeenCalled()
  })

  it('records the accounts that were queued when others cannot be', async () => {
    mocks.enqueue.mockRejectedValueOnce(new Error('redis unavailable'))

    await expect(retryFailedVideoBackfillJobsAction()).resolves.toEqual({
      error:
        '失敗した過去動画の取り込みを1件キューに追加しました（1件は追加できませんでした: redis unavailable）。',
      success: false,
    })
    expect(test.createAuditLog).toHaveBeenCalledOnce()
  })

  it('does nothing when no job failed', async () => {
    supabase.on('select', 'video_backfill_latest_jobs', [])

    await expect(retryFailedVideoBackfillJobsAction()).resolves.toEqual({
      error: '失敗した過去動画の取り込みはありません。',
      success: false,
    })
    expect(mocks.enqueue).not.toHaveBeenCalled()
  })
})
