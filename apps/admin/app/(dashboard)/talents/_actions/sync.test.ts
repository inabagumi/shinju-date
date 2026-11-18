import { CACHE_TAGS } from '@shinju-date/constants'
import type { SyncAccountResult } from '@shinju-date/scraper'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupActionTest } from '@/test/action-harness'
import { postgresError } from '@/test/supabase'
import {
  syncTalentAccountsAction,
  syncTalentWithTwitchAction,
  syncTalentWithYouTubeAction,
} from './sync'

const scraper = vi.hoisted(() => ({
  createScraper: vi.fn(),
  twitch: vi.fn(),
  youtube: vi.fn(),
}))

vi.mock('@/lib/scraper', () => ({ createScraper: scraper.createScraper }))

const test = setupActionTest()

/**
 * 予期しない例外のときに画面に出る文（`@/lib/action` の `ACTION_FAILED_ERROR_MESSAGE`）。
 * `@/lib/action` を読み込むと、`@/test/action-harness` のモックより先に `@/lib/auth` が
 * 読み込まれてしまうため、ここに書く。
 */
const ACTION_FAILED_ERROR =
  '処理に失敗しました。時間をおいて、もう一度お試しください。'
const { supabase } = test

const now = Temporal.Instant.from('2024-11-24T17:00:00Z')

vi.spyOn(Temporal.Now, 'instant').mockReturnValue(now)

const talentId = '123e4567-e89b-12d3-a456-426614174000'

const YOUTUBE_CHANNEL_NOT_FOUND_ERROR =
  'YouTubeでチャンネルが見つかりませんでした。チャンネルIDが正しいか確認してください。'
const TWITCH_USER_NOT_FOUND_ERROR =
  'Twitchでユーザーが見つかりませんでした。ユーザーIDが正しいか確認してください。'

const revalidated = {
  paths: [`/talents/${talentId}`, '/talents'],
  tags: [[CACHE_TAGS.TALENTS, CACHE_TAGS.VIDEOS]],
}

/** A channel whose name changed. */
const updatedChannel: SyncAccountResult = {
  accountId: 'channel-row-1',
  changes: { after: { name: 'New Name' }, before: { name: 'Old Name' } },
  iconUpdated: false,
  name: 'New Name',
  status: 'updated',
}

/** A user whose login changed. */
const updatedUser: SyncAccountResult = {
  accountId: 'user-row-1',
  changes: {
    after: { twitch_login_name: 'newlogin' },
    before: { twitch_login_name: 'oldlogin' },
  },
  iconUpdated: false,
  name: 'User',
  status: 'updated',
}

function account(
  status: SyncAccountResult['status'],
  overrides: Partial<SyncAccountResult> = {},
): SyncAccountResult {
  return {
    accountId: 'account-row',
    iconUpdated: false,
    name: 'Name',
    status,
    ...overrides,
  }
}

/** Makes the scrapers return these results for the talent. */
function syncTo({
  twitch = [],
  youtube = [],
}: {
  twitch?: SyncAccountResult[] | Error
  youtube?: SyncAccountResult[] | Error
}): void {
  for (const [mock, results] of [
    [scraper.youtube, youtube],
    [scraper.twitch, twitch],
  ] as const) {
    if (results instanceof Error) {
      mock.mockRejectedValue(results)
    } else {
      mock.mockResolvedValue(results)
    }
  }
}

function talentTouches() {
  return supabase.calls('rpc', 'touch_talent')
}

beforeEach(() => {
  scraper.createScraper.mockImplementation(
    (platform: 'twitch' | 'youtube') => ({
      syncTalentAccounts: scraper[platform],
    }),
  )
  supabase.on('select', 'talents', [{ id: talentId, name: 'Talent Name' }])
})

describe('syncTalentWithYouTubeAction', () => {
  it('syncs the channels of a talent that is not deleted with the YouTube scraper', async () => {
    syncTo({ youtube: [account('unchanged')] })

    await syncTalentWithYouTubeAction(talentId)

    expect(scraper.createScraper).toHaveBeenCalledWith('youtube')
    expect(scraper.youtube).toHaveBeenCalledWith(talentId, now)
    expect(scraper.twitch).not.toHaveBeenCalled()
    expect(supabase.calls('select', 'talents')[0]?.query).toMatchObject({
      deleted_at: 'is.null',
      id: `eq.${talentId}`,
    })
  })

  it('touches the talent, records the changes and revalidates when a channel was updated', async () => {
    syncTo({ youtube: [updatedChannel, account('unchanged')] })

    const result = await syncTalentWithYouTubeAction(talentId)

    expect(result).toEqual({ data: { unchanged: false }, success: true })
    expect(talentTouches()[0]?.body).toEqual({ p_talent_id: talentId })
    test.expectAuditLog('CHANNEL_SYNC', talentId, {
      accounts: [
        {
          changes: updatedChannel.changes,
          id: 'channel-row-1',
          name: 'New Name',
        },
      ],
      entityName: 'Talent Name',
      platform: 'youtube',
    })
    test.expectRevalidated(revalidated)
  })

  it('records a changed icon even when the name did not change', async () => {
    syncTo({
      youtube: [account('updated', { accountId: 'row', iconUpdated: true })],
    })

    const result = await syncTalentWithYouTubeAction(talentId)

    expect(result).toEqual({ data: { unchanged: false }, success: true })
    test.expectAuditLog('CHANNEL_SYNC', talentId, {
      accounts: [{ iconUpdated: true, id: 'row', name: 'Name' }],
      entityName: 'Talent Name',
      platform: 'youtube',
    })
  })

  it('reports up to date without touching anything when no channel changed', async () => {
    syncTo({ youtube: [account('unchanged'), account('not-found')] })

    const result = await syncTalentWithYouTubeAction(talentId)

    expect(result).toEqual({
      data: { message: 'チャンネル情報は既に最新です。', unchanged: true },
      success: true,
    })
    expect(talentTouches()).toHaveLength(0)
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })

  it('still reports the updated channels when another one is missing on YouTube', async () => {
    syncTo({ youtube: [updatedChannel, account('not-found')] })

    await expect(syncTalentWithYouTubeAction(talentId)).resolves.toEqual({
      data: { unchanged: false },
      success: true,
    })
  })

  it.each([
    ['missing on YouTube', 'not-found'],
    ['failed to be written', 'failed'],
  ] as const)('fails when every channel is %s', async (_, status) => {
    syncTo({ youtube: [account(status)] })

    const result = await syncTalentWithYouTubeAction(talentId)

    expect(result).toEqual({
      error: YOUTUBE_CHANNEL_NOT_FOUND_ERROR,
      success: false,
    })
    test.expectNoAuditLog()
  })

  it('fails without the message of the error when YouTube cannot be read', async () => {
    const error = new Error('quota exceeded')
    syncTo({ youtube: error })

    const result = await syncTalentWithYouTubeAction(talentId)

    expect(result).toEqual({
      error: ACTION_FAILED_ERROR,
      success: false,
    })
    expect(test.logger.error).toHaveBeenCalledWith(
      'タレントの同期に失敗しました',
      { error, platform: 'youtube', talentId },
    )
    test.expectNoAuditLog()
  })

  it('fails when the talent cannot be touched', async () => {
    syncTo({ youtube: [updatedChannel] })
    supabase.on(
      'rpc',
      'touch_talent',
      postgresError('42501', 'permission denied'),
    )

    const result = await syncTalentWithYouTubeAction(talentId)

    expect(result).toEqual({
      error: ACTION_FAILED_ERROR,
      success: false,
    })
    test.expectNoAuditLog()
  })

  it('returns an error when the talent has no YouTube channels', async () => {
    syncTo({ youtube: [] })

    await expect(syncTalentWithYouTubeAction(talentId)).resolves.toEqual({
      error: 'このタレントに紐づくYouTubeチャンネルはありません。',
      success: false,
    })
  })

  it('returns an error without syncing when the talent is not found', async () => {
    supabase.on('select', 'talents', [])

    await expect(syncTalentWithYouTubeAction(talentId)).resolves.toEqual({
      error: 'タレントが見つかりませんでした。',
      success: false,
    })
    expect(scraper.createScraper).not.toHaveBeenCalled()
  })
})

describe('syncTalentWithTwitchAction', () => {
  it('syncs the users with the Twitch scraper and records the changes', async () => {
    syncTo({ twitch: [updatedUser] })

    const result = await syncTalentWithTwitchAction(talentId)

    expect(result).toEqual({ data: { unchanged: false }, success: true })
    expect(scraper.createScraper).toHaveBeenCalledWith('twitch')
    expect(scraper.twitch).toHaveBeenCalledWith(talentId, now)
    test.expectAuditLog('CHANNEL_SYNC', talentId, {
      accounts: [
        { changes: updatedUser.changes, id: 'user-row-1', name: 'User' },
      ],
      entityName: 'Talent Name',
      platform: 'twitch',
    })
    test.expectRevalidated(revalidated)
  })

  it('reports up to date when no user changed', async () => {
    syncTo({ twitch: [account('unchanged')] })

    await expect(syncTalentWithTwitchAction(talentId)).resolves.toEqual({
      data: { message: 'Twitchユーザー情報は既に最新です。', unchanged: true },
      success: true,
    })
    test.expectNoAuditLog()
  })

  it('records the icon of a user whose name could not be written', async () => {
    syncTo({
      twitch: [account('failed', { accountId: 'row', iconUpdated: true })],
    })

    const result = await syncTalentWithTwitchAction(talentId)

    expect(result).toEqual({ data: { unchanged: false }, success: true })
    test.expectAuditLog('CHANNEL_SYNC', talentId, {
      accounts: [{ iconUpdated: true, id: 'row', name: 'Name' }],
      entityName: 'Talent Name',
      platform: 'twitch',
    })
  })

  it('fails when the name could not be written and the icon is unchanged', async () => {
    syncTo({ twitch: [account('failed')] })

    await expect(syncTalentWithTwitchAction(talentId)).resolves.toEqual({
      error: TWITCH_USER_NOT_FOUND_ERROR,
      success: false,
    })
    test.expectNoAuditLog()
  })

  it('returns an error when the talent has no Twitch users', async () => {
    syncTo({ twitch: [] })

    await expect(syncTalentWithTwitchAction(talentId)).resolves.toEqual({
      error: 'このタレントに紐づくTwitchユーザーはありません。',
      success: false,
    })
  })
})

describe('syncTalentAccountsAction', () => {
  it('syncs both platforms and reports each of them', async () => {
    syncTo({ twitch: [updatedUser], youtube: [updatedChannel] })

    const result = await syncTalentAccountsAction(talentId)

    expect(result).toEqual({
      data: {
        message:
          'YouTube: チャンネル情報を同期しました。\nTwitch: ユーザー情報を同期しました。',
        unchanged: false,
      },
      success: true,
    })
    expect(test.createAuditLog).toHaveBeenCalledTimes(2)
    test.expectAuditLog(
      'CHANNEL_SYNC',
      talentId,
      expect.objectContaining({ platform: 'youtube' }),
    )
    test.expectAuditLog(
      'CHANNEL_SYNC',
      talentId,
      expect.objectContaining({ platform: 'twitch' }),
    )
  })

  it('reports only the platforms the talent has accounts on', async () => {
    syncTo({ twitch: [updatedUser] })

    await expect(syncTalentAccountsAction(talentId)).resolves.toEqual({
      data: {
        message: 'Twitch: ユーザー情報を同期しました。',
        unchanged: false,
      },
      success: true,
    })
  })

  it('keeps the Twitch result when YouTube fails and warns which one failed', async () => {
    syncTo({ twitch: [updatedUser], youtube: new Error('quota exceeded') })

    const result = await syncTalentAccountsAction(talentId)

    expect(result).toEqual({
      data: {
        message: 'Twitch: ユーザー情報を同期しました。',
        unchanged: false,
      },
      success: true,
      warnings: ['YouTube: 同期に失敗しました。'],
    })
    expect(test.createAuditLog).toHaveBeenCalledTimes(1)
    test.expectAuditLog(
      'CHANNEL_SYNC',
      talentId,
      expect.objectContaining({ platform: 'twitch' }),
    )
  })

  it('warns about a platform whose accounts were all missing', async () => {
    syncTo({ twitch: [account('unchanged')], youtube: [account('not-found')] })

    await expect(syncTalentAccountsAction(talentId)).resolves.toEqual({
      data: {
        message: 'Twitch: ユーザー情報は既に最新です。',
        unchanged: true,
      },
      success: true,
      warnings: [
        `YouTube: 同期に失敗しました。${YOUTUBE_CHANNEL_NOT_FOUND_ERROR}`,
      ],
    })
  })

  it('fails when every platform fails', async () => {
    syncTo({
      twitch: [account('not-found')],
      youtube: new Error('quota exceeded'),
    })

    await expect(syncTalentAccountsAction(talentId)).resolves.toEqual({
      error: `YouTube: 同期に失敗しました。\nTwitch: 同期に失敗しました。${TWITCH_USER_NOT_FOUND_ERROR}`,
      success: false,
    })
    test.expectNoAuditLog()
  })

  it('reports each platform when everything is up to date', async () => {
    syncTo({ twitch: [account('unchanged')], youtube: [account('unchanged')] })

    const result = await syncTalentAccountsAction(talentId)

    expect(result).toEqual({
      data: {
        message:
          'YouTube: チャンネル情報は既に最新です。\nTwitch: ユーザー情報は既に最新です。',
        unchanged: true,
      },
      success: true,
    })
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })

  it('returns an error when the talent has no accounts', async () => {
    syncTo({})

    await expect(syncTalentAccountsAction(talentId)).resolves.toEqual({
      error:
        'このタレントに紐づくYouTubeチャンネル・Twitchユーザーはありません。',
      success: false,
    })
  })

  it('returns an error without syncing when the talent cannot be loaded', async () => {
    supabase.on(
      'select',
      'talents',
      postgresError('42501', 'permission denied'),
    )

    const result = await syncTalentAccountsAction(talentId)

    expect(result).toEqual({
      error: ACTION_FAILED_ERROR,
      success: false,
    })
    expect(scraper.createScraper).not.toHaveBeenCalled()
  })
})
