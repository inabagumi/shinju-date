import { resolveYouTubeChannel } from '@shinju-date/youtube-api-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionError } from '@/lib/action'
import { setupActionTest } from '@/test/action-harness'
import { postgresError } from '@/test/supabase'
import { linkAccount, resolveAccount, touchTalent } from './talent-accounts'

vi.mock('@shinju-date/youtube-api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shinju-date/youtube-api-client')>()),
  resolveYouTubeChannel: vi.fn(),
}))

// アイコンの同期は service role を使うため、ここではモックする
vi.mock('@/lib/youtube-channel-icon', () => ({
  syncYouTubeChannelIconSafely: vi.fn().mockResolvedValue('unchanged'),
}))

const test = setupActionTest()
const { supabase } = test

vi.spyOn(Temporal.Now, 'instant').mockReturnValue(
  Temporal.Instant.from('2024-11-24T17:00:00Z'),
)

const talentId = '123e4567-e89b-12d3-a456-426614174000'
const youtubeChannelId = 'UCabcdefghijklmnopqrstuv'

const youtubeChannel = {
  contentDetails: {
    relatedPlaylists: { uploads: 'UUabcdefghijklmnopqrstuv' },
  },
  id: youtubeChannelId,
  snippet: { customUrl: '@example', title: 'Example Channel' },
}

function talentTouches() {
  return supabase.calls('rpc', 'touch_talent')
}

describe('touchTalent', () => {
  it('moves the updated_at of the talent with touch_talent', async () => {
    const error = await touchTalent(supabase.client, talentId)

    expect(error).toBeNull()
    expect(talentTouches()).toHaveLength(1)
    expect(talentTouches()[0]?.body).toEqual({ p_talent_id: talentId })
    // `updated_at` is left to the trigger, so the talent is not updated directly
    expect(supabase.calls('update', 'talents')).toHaveLength(0)
    expect(test.logger.error).not.toHaveBeenCalled()
  })

  it('logs and returns the error instead of throwing when the update fails', async () => {
    supabase.on(
      'rpc',
      'touch_talent',
      postgresError('42501', 'permission denied'),
    )

    const error = await touchTalent(supabase.client, talentId)

    expect(error).toMatchObject({
      code: '42501',
      message: 'permission denied',
    })
    expect(test.logger.error).toHaveBeenCalledWith(
      'タレントの更新日時の更新に失敗しました',
      { error, talentId },
    )
  })
})

describe('resolveAccount', () => {
  beforeEach(() => {
    vi.mocked(resolveYouTubeChannel).mockResolvedValue(youtubeChannel as never)
  })

  it('returns the account of the platform without writing anything', async () => {
    const account = await resolveAccount('youtube', {
      input: youtubeChannelId,
      supabaseClient: supabase.client,
    })

    expect(account).toEqual({ platform: 'youtube', remote: youtubeChannel })
    expect(
      supabase.requests.map(({ operation, table }) => [operation, table]),
    ).toEqual([['select', 'youtube_channels']])
  })

  it('reports an account of any talent as taken when no talent is given', async () => {
    supabase.on('select', 'youtube_channels', { talent_id: talentId })

    const promise = resolveAccount('youtube', {
      input: youtubeChannelId,
      supabaseClient: supabase.client,
    })

    await expect(promise).rejects.toBeInstanceOf(ActionError)
    await expect(promise).rejects.toMatchObject({
      field: 'youtube_channel_id',
      message: 'このチャンネルは別のタレントに既に登録されています。',
    })
  })

  it('throws the error of the database when the accounts cannot be read', async () => {
    supabase.on(
      'select',
      'youtube_channels',
      postgresError('XX000', 'Select failed'),
    )

    const promise = resolveAccount('youtube', {
      input: youtubeChannelId,
      supabaseClient: supabase.client,
    })

    await expect(promise).rejects.toMatchObject({ code: 'XX000' })
    await expect(promise).rejects.not.toBeInstanceOf(ActionError)
  })

  it.each([[''], ['ab']])(
    'throws an error that is not shown on the screen for the input %j that is not validated',
    async (input) => {
      const promise = resolveAccount('youtube', {
        input,
        supabaseClient: supabase.client,
      })

      await expect(promise).rejects.toBeInstanceOf(TypeError)
      await expect(promise).rejects.not.toBeInstanceOf(ActionError)
      expect(resolveYouTubeChannel).not.toHaveBeenCalled()
      expect(supabase.requests).toHaveLength(0)
    },
  )
})

describe('linkAccount', () => {
  it('links an account that was resolved before without resolving it again', async () => {
    supabase.on('insert', 'youtube_channels', {
      id: 'channel-row-1',
      name: 'Example Channel',
      talent: { name: 'Example Talent' },
      youtube_channel_id: youtubeChannelId,
      youtube_handle: '@example',
    })

    await linkAccount('youtube', {
      input: { platform: 'youtube', remote: youtubeChannel as never },
      supabaseClient: supabase.client,
      talentId,
    })

    expect(resolveYouTubeChannel).not.toHaveBeenCalled()
    expect(supabase.calls('select', 'youtube_channels')).toHaveLength(0)
    expect(supabase.calls('insert', 'youtube_channels')[0]?.body).toEqual({
      name: 'Example Channel',
      talent_id: talentId,
      youtube_channel_id: youtubeChannelId,
      youtube_handle: '@example',
    })
    test.expectAuditLog('YOUTUBE_CHANNEL_CREATE', talentId, {
      account: {
        id: 'channel-row-1',
        name: 'Example Channel',
        youtube_channel_id: youtubeChannelId,
        youtube_handle: '@example',
      },
      entityName: 'Example Talent',
    })
  })

  it('throws the error of the database when the account cannot be saved', async () => {
    supabase.on(
      'insert',
      'youtube_channels',
      postgresError('XX000', 'Insert failed'),
    )

    const promise = linkAccount('youtube', {
      input: { platform: 'youtube', remote: youtubeChannel as never },
      supabaseClient: supabase.client,
      talentId,
    })

    await expect(promise).rejects.toMatchObject({ code: 'XX000' })
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })
})
