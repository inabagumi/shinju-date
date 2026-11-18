import { resolveTwitchUser } from '@shinju-date/twitch-api-client'
import { resolveYouTubeChannel } from '@shinju-date/youtube-api-client'
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { FormState } from '@/components/form'
import type { AuditAction } from '@/lib/audit-log'
import { syncTwitchUserIconSafely } from '@/lib/twitch-user-icon'
import { syncYouTubeChannelIconSafely } from '@/lib/youtube-channel-icon'
import { setupActionTest } from '@/test/action-harness'
import { postgresError } from '@/test/supabase'
import { addYouTubeChannelAction, removeYouTubeChannelAction } from './channels'
import { addTwitchUserAction, removeTwitchUserAction } from './twitch-users'

vi.mock('@shinju-date/youtube-api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shinju-date/youtube-api-client')>()),
  resolveYouTubeChannel: vi.fn(),
}))

vi.mock('@shinju-date/twitch-api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shinju-date/twitch-api-client')>()),
  resolveTwitchUser: vi.fn(),
}))

// アイコンの同期は service role を使うため、ここではモックして呼び出し内容だけを確認する
vi.mock('@/lib/youtube-channel-icon', () => ({
  syncYouTubeChannelIconSafely: vi.fn().mockResolvedValue('unchanged'),
}))

vi.mock('@/lib/twitch-user-icon', () => ({
  syncTwitchUserIconSafely: vi.fn().mockResolvedValue('unchanged'),
}))

const test = setupActionTest()

/**
 * 予期しない例外のときに画面に出る文（`@/lib/action` の `ACTION_FAILED_ERROR_MESSAGE`）。
 * `@/lib/action` を読み込むと、`@/test/action-harness` のモックより先に `@/lib/auth` が
 * 読み込まれてしまうため、ここに書く。
 */
const ACTION_FAILED_ERROR =
  '処理に失敗しました。時間をおいて、もう一度お試しください。'
const { supabase } = test

vi.spyOn(Temporal.Now, 'instant').mockReturnValue(
  Temporal.Instant.from('2024-11-24T17:00:00Z'),
)

const talentId = '123e4567-e89b-12d3-a456-426614174000'
const accountId = 'account-row-123'
const talent = { name: 'Example Talent' }

const youtubeChannelId = 'UCabcdefghijklmnopqrstuv'
const twitchUserId = '141981764'

const youtubeChannel = {
  contentDetails: {
    relatedPlaylists: {
      uploads: 'UUabcdefghijklmnopqrstuv',
    },
  },
  id: youtubeChannelId,
  snippet: {
    customUrl: '@example_handle',
    title: 'Example Channel',
  },
}

const twitchUser = {
  broadcaster_type: 'partner',
  created_at: '2011-08-08T20:45:44Z',
  description: '',
  display_name: 'ExampleUser',
  id: twitchUserId,
  login: 'exampleuser',
  offline_image_url: '',
  profile_image_url: '',
  type: '',
  view_count: 0,
}

/** What differs between the platforms: the actions, the names and the wording. */
interface PlatformCase {
  addAction: (state: FormState, formData: FormData) => Promise<FormState>
  /** Name of the input of the add form, which the errors are attached to. */
  field: string
  /** Inputs that are understood, with the identifier the API is asked for. */
  inputs: { identifier: unknown; input: string; label: string }[]
  linkAuditAction: AuditAction
  messages: {
    alreadyLinked: string
    apiFailed: string
    credentialsMissing: string
    inputInvalid: string
    inputRequired: string
    linkedToOtherTalent: string
    notFound: string
    unlinkIdsRequired: string
    unlinkNotFound: string
  }
  /** An error of the API client for credentials that are not configured. */
  missingCredentialsError: Error
  platform: 'twitch' | 'youtube'
  /** The account as the API returns it. */
  remote: object
  /** Column of the ID on the platform, also a key of the saved icon. */
  remoteIdColumn: string
  remoteId: string
  removeAction: (
    accountId: string,
    talentId: string,
  ) => Promise<{ error?: string; success: boolean }>
  resolve: Mock
  /** The values saved for the account, without `talent_id`. */
  row: Record<string, string | null>
  syncIcon: Mock
  table: string
  unlinkAuditAction: AuditAction
}

const platformCases: PlatformCase[] = [
  {
    addAction: addYouTubeChannelAction,
    field: 'youtube_channel_id',
    inputs: [
      {
        identifier: { id: youtubeChannelId, kind: 'id' },
        input: youtubeChannelId,
        label: 'a channel ID',
      },
      {
        identifier: { id: youtubeChannelId, kind: 'id' },
        input: `https://www.youtube.com/channel/${youtubeChannelId}`,
        label: 'a channel URL',
      },
      {
        identifier: { handle: 'example_handle', kind: 'handle' },
        input: 'https://www.youtube.com/@example_handle',
        label: 'a handle URL',
      },
    ],
    linkAuditAction: 'YOUTUBE_CHANNEL_CREATE',
    messages: {
      alreadyLinked: 'このチャンネルは既に登録されています。',
      apiFailed:
        'YouTube APIへの接続に失敗しました。しばらくしてから再度お試しください。',
      credentialsMissing:
        'YouTube APIキーが設定されていません。管理者に連絡してください。',
      inputInvalid:
        '有効なチャンネルID（UC...）、ハンドル（@name）、またはYouTube URLを入力してください。',
      inputRequired:
        'YouTubeチャンネルID、ハンドル、またはURLを入力してください。',
      linkedToOtherTalent:
        'このチャンネルは別のタレントに既に登録されています。',
      notFound:
        'YouTubeでチャンネルが見つかりませんでした。入力内容を確認してください。',
      unlinkIdsRequired: 'チャンネルIDまたはタレントIDが指定されていません。',
      unlinkNotFound:
        '指定されたチャンネルが見つかりません。既に削除されているか、存在しないIDが指定されています。',
    },
    missingCredentialsError: new TypeError('An API Key is required.'),
    platform: 'youtube',
    remote: youtubeChannel,
    remoteId: youtubeChannelId,
    remoteIdColumn: 'youtube_channel_id',
    removeAction: removeYouTubeChannelAction,
    resolve: vi.mocked(resolveYouTubeChannel),
    row: {
      name: 'Example Channel',
      youtube_channel_id: youtubeChannelId,
      youtube_handle: '@example_handle',
    },
    syncIcon: vi.mocked(syncYouTubeChannelIconSafely),
    table: 'youtube_channels',
    unlinkAuditAction: 'YOUTUBE_CHANNEL_DELETE',
  },
  {
    addAction: addTwitchUserAction,
    field: 'twitch_user',
    inputs: [
      {
        identifier: { kind: 'login', login: 'exampleuser' },
        input: 'exampleuser',
        label: 'a login name',
      },
      {
        identifier: { id: twitchUserId, kind: 'id' },
        input: twitchUserId,
        label: 'a user ID',
      },
      {
        identifier: { kind: 'login', login: 'exampleuser' },
        input: 'https://www.twitch.tv/exampleuser',
        label: 'a channel URL',
      },
    ],
    linkAuditAction: 'TWITCH_USER_CREATE',
    messages: {
      alreadyLinked: 'このTwitchユーザーは既に登録されています。',
      apiFailed:
        'Twitch APIへの接続に失敗しました。しばらくしてから再度お試しください。',
      credentialsMissing:
        'Twitch APIの認証情報が設定されていません。管理者に連絡してください。',
      inputInvalid:
        '有効なログイン名、ユーザーID（数字）、またはTwitch URLを入力してください。',
      inputRequired:
        'Twitchのログイン名、ユーザーID、またはURLを入力してください。',
      linkedToOtherTalent:
        'このTwitchユーザーは別のタレントに既に登録されています。',
      notFound:
        'Twitchでユーザーが見つかりませんでした。入力内容を確認してください。',
      unlinkIdsRequired:
        'TwitchユーザーIDまたはタレントIDが指定されていません。',
      unlinkNotFound:
        '指定されたTwitchユーザーが見つかりません。既に削除されているか、存在しないIDが指定されています。',
    },
    missingCredentialsError: new TypeError(
      'Twitch Client ID and Client Secret are required (TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET).',
    ),
    platform: 'twitch',
    remote: twitchUser,
    remoteId: twitchUserId,
    remoteIdColumn: 'twitch_user_id',
    removeAction: removeTwitchUserAction,
    resolve: vi.mocked(resolveTwitchUser),
    row: {
      name: 'ExampleUser',
      twitch_login_name: 'exampleuser',
      twitch_user_id: twitchUserId,
    },
    syncIcon: vi.mocked(syncTwitchUserIconSafely),
    table: 'twitch_users',
    unlinkAuditAction: 'TWITCH_USER_DELETE',
  },
]

function talentTouches() {
  return supabase.calls('rpc', 'touch_talent')
}

/** Asserts that the `updated_at` of the talent was moved forward. */
function expectTalentTouched(): void {
  expect(talentTouches()).toHaveLength(1)
  expect(talentTouches()[0]?.body).toEqual({ p_talent_id: talentId })
}

/** Asserts that nothing that follows a change was done. */
function expectNothingCompleted(): void {
  expect(talentTouches()).toHaveLength(0)
  test.expectNoAuditLog()
  test.expectNotRevalidated()
}

describe.each(platformCases)('$platform accounts', (platformCase) => {
  const { field, messages, table } = platformCase
  const [{ input: validInput } = { input: '' }] = platformCase.inputs
  const row = { ...platformCase.row, talent_id: talentId }
  /** The account as the database returns it, with the name of its talent. */
  const savedAccount = { id: accountId, ...platformCase.row, talent }
  /** What the audit log records, with the talent as its target. */
  const auditDetails = {
    account: { id: accountId, ...platformCase.row },
    entityName: talent.name,
  }
  /** The columns read for the audit log, with the name of the talent. */
  const accountSelect = [
    'id',
    ...Object.keys(platformCase.row),
    'talent:talents(name)',
  ]

  function addAccount(fields: Record<string, string>): Promise<FormState> {
    const formData = new FormData()

    for (const [name, value] of Object.entries(fields)) {
      formData.append(name, value)
    }

    return platformCase.addAction({}, formData)
  }

  /** Adds the account with an input that is understood. */
  function addValidAccount(): Promise<FormState> {
    return addAccount({ [field]: validInput, talent_id: talentId })
  }

  /** Lets the insert of the new account succeed and return the account. */
  function answerInsert(): void {
    supabase.on('insert', table, savedAccount)
  }

  /** The rows the action inserted into the table of the accounts. */
  function insertedRows(): unknown[] {
    return supabase.calls('insert', table).map((request) => request.body)
  }

  beforeEach(() => {
    platformCase.resolve.mockResolvedValue(platformCase.remote)
  })

  describe('adding an account', () => {
    it('should add the account with the values from the API', async () => {
      answerInsert()

      const result = await addValidAccount()

      expect(result).toEqual({ success: true })
      expect(insertedRows()).toEqual([row])
      expect(
        supabase.calls('insert', table)[0]?.query['select']?.split(',').sort(),
      ).toEqual([...accountSelect].sort())
      expectTalentTouched()
      test.expectAuditLog(platformCase.linkAuditAction, talentId, auditDetails)
      test.expectRevalidated({
        paths: [`/talents/${talentId}`, '/talents'],
        tags: [['talents', 'videos']],
      })
    })

    it.each(platformCase.inputs)(
      'should resolve the account from $label',
      async ({ identifier, input }) => {
        answerInsert()

        const result = await addAccount({ [field]: input, talent_id: talentId })

        expect(result).toEqual({ success: true })
        expect(platformCase.resolve).toHaveBeenCalledWith(identifier)
        expect(insertedRows()).toEqual([row])
      },
    )

    it('should look for the account by its ID on the platform before adding it', async () => {
      answerInsert()

      await addValidAccount()

      const [lookup] = supabase.calls('select', table)

      expect(lookup?.query[platformCase.remoteIdColumn]).toBe(
        `eq.${platformCase.remoteId}`,
      )
    })

    it('should fetch the icon of the added account', async () => {
      // アイコンの同期に失敗しても（null）、アカウントの追加は成功する
      platformCase.syncIcon.mockResolvedValueOnce(null)
      answerInsert()

      const result = await addValidAccount()

      expect(result).toEqual({ success: true })
      expect(platformCase.syncIcon).toHaveBeenCalledWith(platformCase.remote, {
        id: accountId,
        profile_images: null,
        [platformCase.remoteIdColumn]: platformCase.remoteId,
      })
    })

    it('should add the account even when the talent cannot be touched', async () => {
      answerInsert()
      supabase.on(
        'rpc',
        'touch_talent',
        postgresError('42501', 'permission denied'),
      )

      const result = await addValidAccount()

      expect(result).toEqual({ success: true })
      expect(test.logger.error).toHaveBeenCalledWith(
        'タレントの更新日時の更新に失敗しました',
        expect.objectContaining({ talentId }),
      )
      test.expectAuditLog(platformCase.linkAuditAction, talentId, auditDetails)
    })

    it('should return an error when the talent ID is missing', async () => {
      const result = await addAccount({ [field]: validInput })

      expect(result).toEqual({
        errors: { generic: ['タレントIDが指定されていません。'] },
      })
      expect(platformCase.resolve).not.toHaveBeenCalled()
    })

    it('should return an error on the field when the input is empty', async () => {
      const result = await addAccount({ [field]: '', talent_id: talentId })

      expect(result).toEqual({ errors: { [field]: [messages.inputRequired] } })
      expect(platformCase.resolve).not.toHaveBeenCalled()
    })

    it('should return an error on the field when the input is not understood', async () => {
      // どちらのプラットフォームでも、ID、ハンドル、ログイン名として短すぎる
      const result = await addAccount({ [field]: 'ab', talent_id: talentId })

      expect(result).toEqual({ errors: { [field]: [messages.inputInvalid] } })
      expect(platformCase.resolve).not.toHaveBeenCalled()
    })

    it('should return an error on the field when the account is not on the platform', async () => {
      platformCase.resolve.mockResolvedValue(null)

      const result = await addValidAccount()

      expect(result).toEqual({ errors: { [field]: [messages.notFound] } })
      expect(supabase.requests).toHaveLength(0)
    })

    it('should return an error when the credentials of the API are missing', async () => {
      platformCase.resolve.mockRejectedValue(
        platformCase.missingCredentialsError,
      )

      const result = await addValidAccount()

      expect(result).toEqual({
        errors: { generic: [messages.credentialsMissing] },
      })
      expect(test.logger.error).not.toHaveBeenCalled()
    })

    it('should return an error and log when the API cannot be reached', async () => {
      const apiError = new Error('fetch failed')

      platformCase.resolve.mockRejectedValue(apiError)

      const result = await addValidAccount()

      expect(result).toEqual({ errors: { generic: [messages.apiFailed] } })
      expect(test.logger.error).toHaveBeenCalledWith(
        'アカウントを解決する API の呼び出しに失敗しました',
        { error: apiError, platform: platformCase.platform },
      )
      expect(supabase.requests).toHaveLength(0)
    })

    it.each([
      {
        label: 'this talent',
        linkedTalentId: talentId,
        message: messages.alreadyLinked,
      },
      {
        label: 'another talent',
        linkedTalentId: 'other-talent-id',
        message: messages.linkedToOtherTalent,
      },
    ])(
      'should return an error on the field when the account belongs to $label',
      async ({ linkedTalentId, message }) => {
        supabase.on('select', table, { talent_id: linkedTalentId })

        const result = await addValidAccount()

        expect(result).toEqual({ errors: { [field]: [message] } })
        expect(insertedRows()).toHaveLength(0)
        expect(platformCase.syncIcon).not.toHaveBeenCalled()
        expectNothingCompleted()
      },
    )

    it('should return the same error when the account was added in the meantime', async () => {
      // 追加の前の確認では登録されておらず、行を作るときに一意制約に違反する
      supabase.once('select', table, [])
      supabase.on('select', table, { talent_id: talentId })
      supabase.on(
        'insert',
        table,
        postgresError('23505', 'duplicate key value'),
      )

      const result = await addValidAccount()

      expect(result).toEqual({ errors: { [field]: [messages.alreadyLinked] } })
      expect(platformCase.syncIcon).not.toHaveBeenCalled()
      expectNothingCompleted()
    })

    it('should return an error without fetching an icon when the account cannot be added', async () => {
      supabase.on('insert', table, postgresError('XX000', 'Insert failed'))

      const result = await addValidAccount()

      expect(result).toEqual({
        error: ACTION_FAILED_ERROR,
      })
      expect(test.logger.error).toHaveBeenCalled()
      expect(platformCase.syncIcon).not.toHaveBeenCalled()
      expectNothingCompleted()
    })
  })

  describe('removing an account', () => {
    /** Answers the read of the account before it is removed. */
    function answerAccount(): void {
      supabase.on('select', table, savedAccount)
    }

    it('should remove the account', async () => {
      answerAccount()

      const result = await platformCase.removeAction(accountId, talentId)

      expect(result).toEqual({ success: true })

      const [removal] = supabase.calls('delete', table)

      expect(removal?.query['id']).toBe(`eq.${accountId}`)
      expect(removal?.query['talent_id']).toBe(`eq.${talentId}`)
      expectTalentTouched()
      test.expectAuditLog(
        platformCase.unlinkAuditAction,
        talentId,
        auditDetails,
      )
      test.expectRevalidated({
        paths: [`/talents/${talentId}`, '/talents'],
        tags: [['talents', 'videos']],
      })
    })

    it('should read the columns for the audit log before removing the account', async () => {
      answerAccount()

      await platformCase.removeAction(accountId, talentId)

      const [read] = supabase.calls('select', table)

      expect(read?.query['select']?.split(',').sort()).toEqual(
        [...accountSelect].sort(),
      )
      expect(read?.query['id']).toBe(`eq.${accountId}`)
      expect(read?.query['talent_id']).toBe(`eq.${talentId}`)
    })

    it('should return an error when the account is not found', async () => {
      // No row matches, so `.single()` fails
      supabase.on('select', table, [])

      const result = await platformCase.removeAction(accountId, talentId)

      expect(result).toEqual({
        error: messages.unlinkNotFound,
        success: false,
      })
      expect(test.logger.warn).toHaveBeenCalledWith(
        '削除対象のアカウントが見つかりませんでした',
        { accountId, platform: platformCase.platform, talentId },
      )
      expect(supabase.calls('delete', table)).toHaveLength(0)
      expectNothingCompleted()
    })

    it.each([
      { accountId: '', label: 'the account ID', talentId },
      { accountId, label: 'the talent ID', talentId: '' },
    ])('should return an error when $label is missing', async (ids) => {
      const result = await platformCase.removeAction(
        ids.accountId,
        ids.talentId,
      )

      expect(result).toEqual({
        error: messages.unlinkIdsRequired,
        success: false,
      })
      expect(supabase.requests).toHaveLength(0)
    })

    it('should return an error when the account cannot be removed', async () => {
      answerAccount()
      supabase.on('delete', table, postgresError('XX000', 'Delete failed'))

      const result = await platformCase.removeAction(accountId, talentId)

      expect(result).toEqual({
        error: ACTION_FAILED_ERROR,
        success: false,
      })
      expect(test.logger.error).toHaveBeenCalled()
      expectNothingCompleted()
    })
  })
})
