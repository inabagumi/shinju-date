import { resolveTwitchUser } from '@shinju-date/twitch-api-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncTwitchUserIconSafely } from '@/lib/twitch-user-icon'
import { setupActionTest } from '@/test/action-harness'
import { createTwitchUser } from '@/test/factories'
import { postgresError } from '@/test/supabase'
import { addTwitchUserAction, removeTwitchUserAction } from '../twitch-users'

vi.mock('@shinju-date/twitch-api-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@shinju-date/twitch-api-client')>()
  return {
    ...actual,
    resolveTwitchUser: vi.fn(),
  }
})

// アイコンの同期は service role を使うため、ここではモックして呼び出し内容だけを確認する
vi.mock('@/lib/twitch-user-icon', () => ({
  syncTwitchUserIconSafely: vi.fn().mockResolvedValue('unchanged'),
}))

const test = setupActionTest()
const { supabase } = test

vi.spyOn(Temporal.Now, 'instant').mockReturnValue(
  Temporal.Instant.from('2024-11-24T17:00:00Z'),
)

const talentId = '123e4567-e89b-12d3-a456-426614174000'
const twitchUserId = '141981764'
const newUserId = 'twitch-user-row-123'

const mockTwitchUser = {
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

function createFormData(fields: Record<string, string>): FormData {
  const formData = new FormData()

  for (const [name, value] of Object.entries(fields)) {
    formData.append(name, value)
  }

  return formData
}

/** Lets the insert of the new user succeed and return its id. */
function answerInsert(): void {
  supabase.on('insert', 'twitch_users', { id: newUserId })
}

/** The rows the action inserted into `twitch_users`. */
function insertedRows(): unknown[] {
  return supabase.calls('insert', 'twitch_users').map((request) => request.body)
}

describe('addTwitchUserAction', () => {
  beforeEach(() => {
    vi.mocked(resolveTwitchUser).mockResolvedValue(mockTwitchUser)
  })

  it('should successfully add Twitch user with name and login from API', async () => {
    answerInsert()

    const result = await addTwitchUserAction(
      {},
      createFormData({ talent_id: talentId, twitch_user: 'exampleuser' }),
    )

    expect(result).toEqual({ success: true })
    expect(resolveTwitchUser).toHaveBeenCalledWith({
      kind: 'login',
      login: 'exampleuser',
    })
    expect(insertedRows()).toEqual([
      {
        name: 'ExampleUser',
        talent_id: talentId,
        twitch_login_name: 'exampleuser',
        twitch_user_id: twitchUserId,
      },
    ])
    test.expectAuditLog('TWITCH_USER_CREATE', 'twitch_users', newUserId, {
      name: 'ExampleUser',
      talent_id: talentId,
      twitch_login_name: 'exampleuser',
      twitch_user_id: twitchUserId,
    })
    test.expectRevalidated({
      paths: [`/talents/${talentId}`, '/talents'],
      tags: [['talents', 'videos']],
    })
  })

  it('should fetch the icon of the added user', async () => {
    // アイコンの同期に失敗しても（null）、ユーザーの追加は成功する
    vi.mocked(syncTwitchUserIconSafely).mockResolvedValueOnce(null)
    answerInsert()

    const result = await addTwitchUserAction(
      {},
      createFormData({ talent_id: talentId, twitch_user: 'exampleuser' }),
    )

    expect(result).toEqual({ success: true })
    expect(syncTwitchUserIconSafely).toHaveBeenCalledWith(mockTwitchUser, {
      id: newUserId,
      profile_images: null,
      twitch_user_id: twitchUserId,
    })
  })

  it('should not fetch an icon when the user cannot be added', async () => {
    supabase.on(
      'insert',
      'twitch_users',
      postgresError('23505', 'duplicate key value'),
    )

    const result = await addTwitchUserAction(
      {},
      createFormData({ talent_id: talentId, twitch_user: 'exampleuser' }),
    )

    expect(result).toEqual({
      errors: {
        generic: [
          'Twitchユーザーの追加に失敗しました。しばらくしてから再度お試しください。',
        ],
      },
    })
    expect(syncTwitchUserIconSafely).not.toHaveBeenCalled()
  })

  it('should resolve user from Twitch URL', async () => {
    answerInsert()

    const result = await addTwitchUserAction(
      {},
      createFormData({
        talent_id: talentId,
        twitch_user: 'https://www.twitch.tv/exampleuser',
      }),
    )

    expect(result).toEqual({ success: true })
    expect(resolveTwitchUser).toHaveBeenCalledWith({
      kind: 'login',
      login: 'exampleuser',
    })
  })

  it('should return error when talent_id is missing', async () => {
    const result = await addTwitchUserAction(
      {},
      createFormData({ twitch_user: 'exampleuser' }),
    )

    expect(result).toEqual({
      errors: {
        generic: ['タレントIDが指定されていません。'],
      },
    })
  })

  it('should return error when twitch_user is empty', async () => {
    const result = await addTwitchUserAction(
      {},
      createFormData({ talent_id: talentId, twitch_user: '' }),
    )

    expect(result).toEqual({
      errors: {
        twitch_user: [
          'Twitchのログイン名、ユーザーID、またはURLを入力してください。',
        ],
      },
    })
  })

  it('should return error for invalid input format', async () => {
    const result = await addTwitchUserAction(
      {},
      createFormData({ talent_id: talentId, twitch_user: 'ab' }),
    )

    expect(result).toEqual({
      errors: {
        twitch_user: [
          '有効なログイン名、ユーザーID（数字）、またはTwitch URLを入力してください。',
        ],
      },
    })
  })

  it('should return error when Twitch user is not found', async () => {
    vi.mocked(resolveTwitchUser).mockResolvedValue(null)

    const result = await addTwitchUserAction(
      {},
      createFormData({ talent_id: talentId, twitch_user: 'missinguser' }),
    )

    expect(result).toEqual({
      errors: {
        twitch_user: [
          'Twitchでユーザーが見つかりませんでした。入力内容を確認してください。',
        ],
      },
    })
  })

  it('should return error when credentials are missing', async () => {
    vi.mocked(resolveTwitchUser).mockRejectedValue(
      new TypeError(
        'Twitch Client ID and Client Secret are required (TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET).',
      ),
    )

    const result = await addTwitchUserAction(
      {},
      createFormData({ talent_id: talentId, twitch_user: 'exampleuser' }),
    )

    expect(result).toEqual({
      errors: {
        generic: [
          'Twitch APIの認証情報が設定されていません。管理者に連絡してください。',
        ],
      },
    })
  })

  it('should return error when user already exists for this talent', async () => {
    supabase.on(
      'select',
      'twitch_users',
      createTwitchUser({ id: 'existing-user', talent_id: talentId }),
    )

    const result = await addTwitchUserAction(
      {},
      createFormData({ talent_id: talentId, twitch_user: 'exampleuser' }),
    )

    expect(result).toEqual({
      errors: {
        twitch_user: ['このTwitchユーザーは既に登録されています。'],
      },
    })
  })

  it('should return error when user belongs to another talent', async () => {
    supabase.on(
      'select',
      'twitch_users',
      createTwitchUser({ id: 'existing-user', talent_id: 'other-talent-id' }),
    )

    const result = await addTwitchUserAction(
      {},
      createFormData({ talent_id: talentId, twitch_user: 'exampleuser' }),
    )

    expect(result).toEqual({
      errors: {
        twitch_user: [
          'このTwitchユーザーは別のタレントに既に登録されています。',
        ],
      },
    })
  })
})

describe('removeTwitchUserAction', () => {
  it('should successfully remove Twitch user', async () => {
    supabase.on(
      'select',
      'twitch_users',
      createTwitchUser({
        twitch_login_name: 'exampleuser',
        twitch_user_id: twitchUserId,
      }),
    )

    const result = await removeTwitchUserAction('twitch-user-row-123', talentId)

    expect(result).toEqual({ success: true })
    test.expectAuditLog(
      'TWITCH_USER_DELETE',
      'twitch_users',
      'twitch-user-row-123',
      {
        talent_id: talentId,
        twitch_login_name: 'exampleuser',
        twitch_user_id: twitchUserId,
      },
    )
    test.expectRevalidated({
      paths: [`/talents/${talentId}`, '/talents'],
      tags: [['talents', 'videos']],
    })
  })

  it('should return error when user is not found (PGRST116)', async () => {
    // No row matches, so `.single()` fails with PGRST116
    supabase.on('select', 'twitch_users', [])

    const result = await removeTwitchUserAction('twitch-user-row-123', talentId)

    expect(result).toEqual({
      error:
        '指定されたTwitchユーザーが見つかりません。既に削除されているか、存在しないIDが指定されています。',
      success: false,
    })
    expect(test.logger.warn).toHaveBeenCalled()
  })

  it('should return error when ids are missing', async () => {
    const result1 = await removeTwitchUserAction('', 'talent-id')
    expect(result1).toEqual({
      error: 'TwitchユーザーIDまたはタレントIDが指定されていません。',
      success: false,
    })

    const result2 = await removeTwitchUserAction('user-id', '')
    expect(result2).toEqual({
      error: 'TwitchユーザーIDまたはタレントIDが指定されていません。',
      success: false,
    })
  })
})
