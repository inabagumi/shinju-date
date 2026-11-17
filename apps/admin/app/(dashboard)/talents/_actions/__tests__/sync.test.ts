import { CACHE_TAGS } from '@shinju-date/constants'
import type { SyncAccountResult } from '@shinju-date/scraper'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupActionTest } from '@/test/action-harness'
import { postgresError } from '@/test/supabase'
import {
  syncTalentAccounts,
  syncTalentWithTwitch,
  syncTalentWithYouTube,
} from '../sync'

const scraper = vi.hoisted(() => ({
  createScraper: vi.fn(),
  twitch: vi.fn(),
  youtube: vi.fn(),
}))

vi.mock('@/lib/scraper', () => ({ createScraper: scraper.createScraper }))

const test = setupActionTest()
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

function talentUpdates() {
  return supabase.calls('update', 'talents')
}

beforeEach(() => {
  scraper.createScraper.mockImplementation(
    (platform: 'twitch' | 'youtube') => ({
      syncTalentAccounts: scraper[platform],
    }),
  )
  supabase.on('select', 'talents', [{ id: talentId, name: 'Talent Name' }])
})

describe('syncTalentWithYouTube', () => {
  it('syncs the channels of a talent that is not deleted with the YouTube scraper', async () => {
    syncTo({ youtube: [account('unchanged')] })

    await syncTalentWithYouTube(talentId)

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

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({ success: true })
    expect(talentUpdates()[0]?.body).toEqual({
      updated_at: '2024-11-24T17:00:00Z',
    })
    test.expectAuditLog('CHANNEL_SYNC', 'talents', talentId, {
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

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({ success: true })
    test.expectAuditLog('CHANNEL_SYNC', 'talents', talentId, {
      accounts: [{ iconUpdated: true, id: 'row', name: 'Name' }],
      entityName: 'Talent Name',
      platform: 'youtube',
    })
  })

  it('reports up to date without touching anything when no channel changed', async () => {
    syncTo({ youtube: [account('unchanged'), account('not-found')] })

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({
      message: 'チャンネル情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    expect(talentUpdates()).toHaveLength(0)
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })

  it('still reports the updated channels when another one is missing on YouTube', async () => {
    syncTo({ youtube: [updatedChannel, account('not-found')] })

    await expect(syncTalentWithYouTube(talentId)).resolves.toEqual({
      success: true,
    })
  })

  it.each([
    ['missing on YouTube', 'not-found'],
    ['failed to be written', 'failed'],
  ] as const)('fails when every channel is %s', async (_, status) => {
    syncTo({ youtube: [account(status)] })

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({
      error: YOUTUBE_CHANNEL_NOT_FOUND_ERROR,
      success: false,
    })
    test.expectNoAuditLog()
  })

  it('fails with the error when YouTube cannot be read', async () => {
    syncTo({ youtube: new Error('quota exceeded') })

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({ error: 'quota exceeded', success: false })
    test.expectNoAuditLog()
  })

  it('fails when the talent cannot be touched', async () => {
    syncTo({ youtube: [updatedChannel] })
    supabase.on(
      'update',
      'talents',
      postgresError('42501', 'permission denied'),
    )

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({
      error: '予期しないエラーが発生しました。',
      success: false,
    })
    test.expectNoAuditLog()
  })

  it('returns an error when the talent has no YouTube channels', async () => {
    syncTo({ youtube: [] })

    await expect(syncTalentWithYouTube(talentId)).resolves.toEqual({
      error: 'このタレントに紐づくYouTubeチャンネルはありません。',
      success: false,
    })
  })

  it('returns an error without syncing when the talent is not found', async () => {
    supabase.on('select', 'talents', [])

    await expect(syncTalentWithYouTube(talentId)).resolves.toEqual({
      error: 'タレントが見つかりませんでした。',
      success: false,
    })
    expect(scraper.createScraper).not.toHaveBeenCalled()
  })
})

describe('syncTalentWithTwitch', () => {
  it('syncs the users with the Twitch scraper and records the changes', async () => {
    syncTo({ twitch: [updatedUser] })

    const result = await syncTalentWithTwitch(talentId)

    expect(result).toEqual({ success: true })
    expect(scraper.createScraper).toHaveBeenCalledWith('twitch')
    expect(scraper.twitch).toHaveBeenCalledWith(talentId, now)
    test.expectAuditLog('CHANNEL_SYNC', 'talents', talentId, {
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

    await expect(syncTalentWithTwitch(talentId)).resolves.toEqual({
      message: 'Twitchユーザー情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    test.expectNoAuditLog()
  })

  it('records the icon of a user whose name could not be written', async () => {
    syncTo({
      twitch: [account('failed', { accountId: 'row', iconUpdated: true })],
    })

    const result = await syncTalentWithTwitch(talentId)

    expect(result).toEqual({ success: true })
    test.expectAuditLog('CHANNEL_SYNC', 'talents', talentId, {
      accounts: [{ iconUpdated: true, id: 'row', name: 'Name' }],
      entityName: 'Talent Name',
      platform: 'twitch',
    })
  })

  it('fails when the name could not be written and the icon is unchanged', async () => {
    syncTo({ twitch: [account('failed')] })

    await expect(syncTalentWithTwitch(talentId)).resolves.toEqual({
      error: TWITCH_USER_NOT_FOUND_ERROR,
      success: false,
    })
    test.expectNoAuditLog()
  })

  it('returns an error when the talent has no Twitch users', async () => {
    syncTo({ twitch: [] })

    await expect(syncTalentWithTwitch(talentId)).resolves.toEqual({
      error: 'このタレントに紐づくTwitchユーザーはありません。',
      success: false,
    })
  })
})

describe('syncTalentAccounts', () => {
  it('syncs both platforms and reports each of them', async () => {
    syncTo({ twitch: [updatedUser], youtube: [updatedChannel] })

    const result = await syncTalentAccounts(talentId)

    expect(result).toEqual({
      message:
        'YouTube: チャンネル情報を同期しました。\nTwitch: ユーザー情報を同期しました。',
      success: true,
      unchanged: false,
    })
    expect(test.createAuditLog).toHaveBeenCalledTimes(2)
    test.expectAuditLog(
      'CHANNEL_SYNC',
      'talents',
      talentId,
      expect.objectContaining({ platform: 'youtube' }),
    )
    test.expectAuditLog(
      'CHANNEL_SYNC',
      'talents',
      talentId,
      expect.objectContaining({ platform: 'twitch' }),
    )
  })

  it('reports only the platforms the talent has accounts on', async () => {
    syncTo({ twitch: [updatedUser] })

    await expect(syncTalentAccounts(talentId)).resolves.toEqual({
      message: 'Twitch: ユーザー情報を同期しました。',
      success: true,
      unchanged: false,
    })
  })

  it('keeps the Twitch result when YouTube fails and reports which one failed', async () => {
    syncTo({ twitch: [updatedUser], youtube: new Error('quota exceeded') })

    const result = await syncTalentAccounts(talentId)

    expect(result).toEqual({
      error:
        'YouTube: 同期に失敗しました。quota exceeded\nTwitch: ユーザー情報を同期しました。',
      success: false,
      unchanged: false,
    })
    expect(test.createAuditLog).toHaveBeenCalledTimes(1)
    test.expectAuditLog(
      'CHANNEL_SYNC',
      'talents',
      talentId,
      expect.objectContaining({ platform: 'twitch' }),
    )
  })

  it('reports a platform whose accounts were all missing as failed', async () => {
    syncTo({ twitch: [account('unchanged')], youtube: [account('not-found')] })

    await expect(syncTalentAccounts(talentId)).resolves.toEqual({
      error: `YouTube: 同期に失敗しました。${YOUTUBE_CHANNEL_NOT_FOUND_ERROR}\nTwitch: ユーザー情報は既に最新です。`,
      success: false,
      unchanged: true,
    })
  })

  it('reports each platform when everything is up to date', async () => {
    syncTo({ twitch: [account('unchanged')], youtube: [account('unchanged')] })

    const result = await syncTalentAccounts(talentId)

    expect(result).toEqual({
      message:
        'YouTube: チャンネル情報は既に最新です。\nTwitch: ユーザー情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })

  it('returns an error when the talent has no accounts', async () => {
    syncTo({})

    await expect(syncTalentAccounts(talentId)).resolves.toEqual({
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

    const result = await syncTalentAccounts(talentId)

    expect(result).toEqual({
      error: '予期しないエラーが発生しました。',
      success: false,
    })
    expect(scraper.createScraper).not.toHaveBeenCalled()
  })
})
