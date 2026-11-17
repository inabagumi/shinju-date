import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type AuditLogDetails, createAuditLog } from './audit-log'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(async () => ({ error: null })),
}))

vi.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: async () => ({ rpc: mocks.rpc }),
}))

describe('createAuditLog', () => {
  beforeEach(() => {
    mocks.rpc.mockClear()
  })

  it('records the target table that the action is about', async () => {
    await createAuditLog('VIDEO_DELETE', 'video-1', { entityName: 'Video' })

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('insert_audit_log', {
      p_action: 'VIDEO_DELETE',
      p_details: { entityName: 'Video' },
      p_target_record_id: 'video-1',
      p_target_table: 'videos',
    })
  })

  it('records no details and no record ID for an action without them', async () => {
    await createAuditLog('MAINTENANCE_MODE_ENABLE', null)

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('insert_audit_log', {
      p_action: 'MAINTENANCE_MODE_ENABLE',
      p_details: null,
      p_target_table: 'redis:system',
    })
  })

  it.each([
    'CHANNEL_ACTIVATE',
    'CHANNEL_CREATE',
    'CHANNEL_DELETE',
    'CHANNEL_RESTORE',
    'CHANNEL_RETIRE',
    'CHANNEL_UPDATE',
  ] as const)('records %s against the talent', async (action) => {
    await createAuditLog(action, 'talent-1', { entityName: 'Talent' })

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('insert_audit_log', {
      p_action: action,
      p_details: { entityName: 'Talent' },
      p_target_record_id: 'talent-1',
      p_target_table: 'talents',
    })
  })

  it('records a sync of a talent against the talent', async () => {
    await createAuditLog('CHANNEL_SYNC', 'talent-1', {
      accounts: [{ id: 'account-1', name: 'Account' }],
      entityName: 'Talent',
      platform: 'twitch',
    })

    expect(mocks.rpc).toHaveBeenCalledWith(
      'insert_audit_log',
      expect.objectContaining({ p_target_table: 'talents' }),
    )
  })

  it.each(['TWITCH_USER_CREATE', 'TWITCH_USER_DELETE'] as const)(
    'records %s against the talent of the Twitch user',
    async (action) => {
      await createAuditLog(action, 'talent-1', {
        account: {
          id: 'twitch-user-1',
          name: 'Account',
          twitch_login_name: 'account',
          twitch_user_id: '12345678',
        },
        entityName: 'Talent',
      })

      expect(mocks.rpc).toHaveBeenCalledWith(
        'insert_audit_log',
        expect.objectContaining({
          p_target_record_id: 'talent-1',
          p_target_table: 'talents',
        }),
      )
    },
  )

  it.each(['YOUTUBE_CHANNEL_CREATE', 'YOUTUBE_CHANNEL_DELETE'] as const)(
    'records %s against the talent of the YouTube channel',
    async (action) => {
      await createAuditLog(action, 'talent-1', {
        account: {
          id: 'channel-1',
          name: 'Account',
          youtube_channel_id: 'UC1234567890123456789012',
          youtube_handle: '@account',
        },
        entityName: 'Talent',
      })

      expect(mocks.rpc).toHaveBeenCalledWith(
        'insert_audit_log',
        expect.objectContaining({
          p_target_record_id: 'talent-1',
          p_target_table: 'talents',
        }),
      )
    },
  )

  it('records a backfill of a talent against the talent', async () => {
    await createAuditLog('VIDEO_BACKFILL', 'talent-1', {
      accounts: [{ accountId: 'account-1', name: 'Account' }],
      entityName: 'Talent',
      platform: 'youtube',
    })

    expect(mocks.rpc).toHaveBeenCalledWith(
      'insert_audit_log',
      expect.objectContaining({ p_target_table: 'talents' }),
    )
  })

  it.each<AuditLogDetails<'VIDEO_BACKFILL'>>([
    {
      accounts: 2,
      entityName: '全タレントの取得漏れチェック（2件）',
      failed: 0,
      scope: 'all',
      skipped: 0,
      targets: { twitch: 1, youtube: 1 },
    },
    {
      accounts: [],
      entityName: '失敗した過去動画の取り込みの再試行（0件）',
      failed: 0,
      scope: 'retry',
      skipped: 0,
    },
  ])(
    'records a backfill of all talents ($scope) against the backfill queue',
    async (details) => {
      await createAuditLog('VIDEO_BACKFILL', null, details)

      expect(mocks.rpc).toHaveBeenCalledWith(
        'insert_audit_log',
        expect.objectContaining({ p_target_table: 'redis:video-backfill' }),
      )
    },
  )
})
