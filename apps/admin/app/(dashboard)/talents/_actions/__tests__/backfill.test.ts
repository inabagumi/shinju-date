import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAuditLog: vi.fn(),
  enqueue: vi.fn(),
  getJobs: vi.fn(),
  maybeSingle: vi.fn(),
}))

vi.mock('@/lib/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  requireAuthenticatedUser: vi.fn(async () => ({
    supabaseClient: {
      from: vi.fn(() => {
        const query = {
          eq: vi.fn(() => query),
          is: vi.fn(() => query),
          maybeSingle: mocks.maybeSingle,
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
  BackfillQueue: class {
    enqueue = mocks.enqueue
    getJobs = mocks.getJobs
  },
}))

const { getVideoBackfillStatusAction, requestVideoBackfillAction } =
  await import('../backfill')

const talentId = '123e4567-e89b-12d3-a456-426614174000'
const talent = {
  name: 'Talent',
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
    { id: 'channel-row-2', name: null, youtube_channel_id: 'UCbbb' },
  ],
}

describe('requestVideoBackfillAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.maybeSingle.mockResolvedValue({ data: talent, error: null })
    mocks.enqueue.mockResolvedValue({ enqueued: true, job: {} })
  })

  it('queues one job per account of the platform and records who asked', async () => {
    await expect(
      requestVideoBackfillAction(talentId, 'youtube'),
    ).resolves.toMatchObject({ success: true })

    expect(mocks.enqueue.mock.calls).toEqual([
      [
        {
          accountId: 'channel-row-1',
          provider: 'youtube',
          requestedBy: 'user-1',
          talentId,
        },
      ],
      [
        {
          accountId: 'channel-row-2',
          provider: 'youtube',
          requestedBy: 'user-1',
          talentId,
        },
      ],
    ])
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      'VIDEO_BACKFILL',
      'channels',
      talentId,
      {
        accounts: [
          { accountId: 'channel-row-1', name: 'Main' },
          { accountId: 'channel-row-2', name: 'UCbbb' },
        ],
        entityName: 'Talent',
        platform: 'youtube',
      },
    )
  })

  it('refuses while every job of the platform is still running', async () => {
    mocks.enqueue.mockResolvedValue({ enqueued: false, job: {} })

    await expect(
      requestVideoBackfillAction(talentId, 'twitch'),
    ).resolves.toEqual({
      error: 'Twitchの過去動画の取り込みは既に実行中です。',
      success: false,
    })
    expect(mocks.createAuditLog).not.toHaveBeenCalled()
  })

  it('reports the accounts that were skipped', async () => {
    mocks.enqueue
      .mockResolvedValueOnce({ enqueued: false, job: {} })
      .mockResolvedValueOnce({ enqueued: true, job: {} })

    const result = await requestVideoBackfillAction(talentId, 'youtube')

    expect(result.message).toContain('実行中の1件は除く')
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      'VIDEO_BACKFILL',
      'channels',
      talentId,
      expect.objectContaining({
        accounts: [{ accountId: 'channel-row-2', name: 'UCbbb' }],
      }),
    )
  })

  it('records the jobs that were queued when another one fails', async () => {
    mocks.enqueue
      .mockResolvedValueOnce({ enqueued: true, job: {} })
      .mockRejectedValueOnce(new Error('redis unavailable'))

    await expect(
      requestVideoBackfillAction(talentId, 'youtube'),
    ).resolves.toEqual({
      error:
        'YouTubeの過去動画の取り込みを1件キューに追加しましたが、1件は追加できませんでした（redis unavailable）。',
      success: false,
    })
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      'VIDEO_BACKFILL',
      'channels',
      talentId,
      expect.objectContaining({
        accounts: [{ accountId: 'channel-row-1', name: 'Main' }],
      }),
    )
  })

  it('reports a failure without an audit log when nothing was queued', async () => {
    mocks.enqueue.mockRejectedValue(new Error('redis unavailable'))

    await expect(
      requestVideoBackfillAction(talentId, 'twitch'),
    ).resolves.toEqual({
      error:
        'Twitchの過去動画の取り込みをキューに追加できませんでした（redis unavailable）。',
      success: false,
    })
    expect(mocks.createAuditLog).not.toHaveBeenCalled()
  })

  it('rejects a talent without accounts of the platform', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { ...talent, twitch_users: [] },
      error: null,
    })

    await expect(
      requestVideoBackfillAction(talentId, 'twitch'),
    ).resolves.toEqual({
      error: 'このタレントに紐づくTwitchアカウントはありません。',
      success: false,
    })
    expect(mocks.enqueue).not.toHaveBeenCalled()
  })

  it('rejects a talent that is deleted or unknown', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })

    await expect(
      requestVideoBackfillAction(talentId, 'youtube'),
    ).resolves.toEqual({
      error: 'タレントが見つかりませんでした。',
      success: false,
    })
  })

  it('rejects an unknown platform', async () => {
    await expect(
      requestVideoBackfillAction(talentId, 'niconico' as unknown as 'youtube'),
    ).resolves.toMatchObject({ success: false })
    expect(mocks.maybeSingle).not.toHaveBeenCalled()
  })
})

describe('getVideoBackfillStatusAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.maybeSingle.mockResolvedValue({ data: talent, error: null })
  })

  it('returns the progress of every account', async () => {
    mocks.getJobs.mockResolvedValue([
      {
        active: true,
        job: {
          added: 12,
          error: null,
          finishedAt: null,
          pages: 3,
          requestedAt: '2026-11-14T00:00:00Z',
          status: 'running',
          updatedAt: '2026-11-14T00:02:00Z',
        },
      },
      null,
      null,
    ])

    const result = await getVideoBackfillStatusAction(talentId)

    expect(mocks.getJobs).toHaveBeenCalledWith([
      'youtube:channel-row-1',
      'youtube:channel-row-2',
      'twitch:twitch-row-1',
    ])
    expect(result.accounts).toEqual([
      expect.objectContaining({
        accountId: 'channel-row-1',
        active: true,
        added: 12,
        name: 'Main',
        status: 'running',
      }),
      expect.objectContaining({
        accountId: 'channel-row-2',
        active: false,
        added: 0,
        status: null,
      }),
      expect.objectContaining({
        accountId: 'twitch-row-1',
        name: 'alice',
        provider: 'twitch',
        status: null,
      }),
    ])
  })
})
