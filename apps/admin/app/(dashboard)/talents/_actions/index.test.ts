import { resolveYouTubeChannel } from '@shinju-date/youtube-api-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditAction } from '@/lib/audit-log'
import { syncYouTubeChannelIconSafely } from '@/lib/youtube-channel-icon'
import { setupActionTest } from '@/test/action-harness'
import { createTalent, createYouTubeChannel } from '@/test/factories'
import { postgresError } from '@/test/supabase'
import {
  activateTalentAction,
  createTalentAction,
  deleteTalentAction,
  restoreTalentAction,
  retireTalentAction,
  updateTalentAction,
} from './index'

vi.mock('@shinju-date/youtube-api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shinju-date/youtube-api-client')>()),
  resolveYouTubeChannel: vi.fn(),
}))

// アイコンの同期は service role を使うため、ここではモックして呼び出し内容だけを確認する
vi.mock('@/lib/youtube-channel-icon', () => ({
  hasProfileImageChanged: (result: string | null) =>
    result !== null && result !== 'unchanged',
  syncYouTubeChannelIconSafely: vi.fn().mockResolvedValue('unchanged'),
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

const TALENT_ID = '123e4567-e89b-12d3-a456-426614174000'
const NOW = '2024-11-24T17:00:00Z'

/** The error Supabase returns for `databaseErrorResponse()`. */
const DATABASE_ERROR = {
  code: 'PGRST500',
  details: null,
  hint: null,
  message: 'Database connection error',
}

function databaseErrorResponse(): Response {
  return postgresError(DATABASE_ERROR.code, DATABASE_ERROR.message)
}

function talentUpdates() {
  return supabase.calls('update', 'talents')
}

/** Answers the talent update with the updated talent's name. */
function mockTalentUpdate(name = 'Updated Talent') {
  supabase.on('update', 'talents', { name })
}

describe('updateTalentAction', () => {
  it('should successfully update talent', async () => {
    mockTalentUpdate()

    const formData = new FormData()
    formData.append('id', TALENT_ID)
    formData.append('name', 'Updated Talent')
    formData.append('theme_color', '#FF5733')

    const result = await updateTalentAction({}, formData)

    expect(result).toEqual({ success: true })
    expect(talentUpdates()[0]?.body).toEqual({
      name: 'Updated Talent',
      reading: null,
      theme_color: '#FF5733',
    })
    test.expectAuditLog('CHANNEL_UPDATE', TALENT_ID, {
      entityName: 'Updated Talent',
    })
    test.expectRevalidated({
      paths: ['/talents'],
      tags: [['talents', 'videos']],
    })
  })

  it('should return error when talent is not found', async () => {
    // No row matches, so `.single()` fails
    supabase.on('update', 'talents', [])

    const formData = new FormData()
    formData.append('id', TALENT_ID)
    formData.append('name', 'Updated Talent')

    const result = await updateTalentAction({}, formData)

    expect(result).toEqual({
      errors: {
        generic: [
          '指定されたタレントが見つかりません。既に削除されているか、存在しないIDが指定されています。',
        ],
      },
    })
    expect(test.logger.warn).toHaveBeenCalledWith(
      '更新対象のタレントが見つかりませんでした',
      { id: TALENT_ID },
    )
  })

  it('should update the talent whose ID has the same form as the seed', async () => {
    // supabase/seed.sql のタレントの ID。RFC 9562 のバージョンとバリアントの桁が 0 でも、
    // DB の uuid 型は受け付ける
    const seedTalentId = '00000000-0000-0000-0000-000000000001'
    mockTalentUpdate()

    const formData = new FormData()
    formData.append('id', seedTalentId)
    formData.append('name', 'Updated Talent')

    const result = await updateTalentAction({}, formData)

    expect(result).toEqual({ success: true })
    expect(talentUpdates()).toHaveLength(1)
    test.expectAuditLog('CHANNEL_UPDATE', seedTalentId, {
      entityName: 'Updated Talent',
    })
  })

  it('should return a generic error for an invalid ID', async () => {
    const formData = new FormData()
    formData.append('id', 'invalid-uuid')
    formData.append('name', 'Updated Talent')

    const result = await updateTalentAction({}, formData)

    // 隠しフィールドのエラーは、画面に出るよう項目に結び付けない
    expect(result).toEqual({
      errors: { generic: ['有効なIDではありません。'] },
    })
    expect(talentUpdates()).toHaveLength(0)
  })

  it('should return validation error for empty name', async () => {
    const formData = new FormData()
    formData.append('id', TALENT_ID)
    formData.append('name', '')

    const result = await updateTalentAction({}, formData)

    expect(result.errors?.['name']).toBeDefined()
  })

  it('should return validation error for invalid color format', async () => {
    const formData = new FormData()
    formData.append('id', TALENT_ID)
    formData.append('name', 'Updated Talent')
    formData.append('theme_color', 'invalid-color')

    const result = await updateTalentAction({}, formData)

    expect(result.errors?.['theme_color']).toBeDefined()
  })

  it('should handle null theme_color', async () => {
    mockTalentUpdate()

    const formData = new FormData()
    formData.append('id', TALENT_ID)
    formData.append('name', 'Updated Talent')
    // Don't append theme_color at all to test null handling

    const result = await updateTalentAction({}, formData)

    expect(result).toEqual({ success: true })
    expect(talentUpdates()[0]?.body).toEqual({
      name: 'Updated Talent',
      reading: null,
      theme_color: null,
    })
  })

  it('should save the reading normalized to NFC without surrounding spaces', async () => {
    mockTalentUpdate()

    const formData = new FormData()
    formData.append('id', TALENT_ID)
    formData.append('name', 'Updated Talent')
    // 分解表現の濁点（U+3099）を含む「しんじゅ」
    formData.append('reading', ' しんじゅー　')

    const result = await updateTalentAction({}, formData)

    expect(result).toEqual({ success: true })
    expect(talentUpdates()[0]?.body).toEqual({
      name: 'Updated Talent',
      reading: 'しんじゅー',
      theme_color: null,
    })
  })

  it('should save the decomposed and precomposed voiced sounds as the same value', async () => {
    mockTalentUpdate()

    for (const reading of ['がぱ', 'がぱ']) {
      const formData = new FormData()
      formData.append('id', TALENT_ID)
      formData.append('name', 'Updated Talent')
      formData.append('reading', reading)

      await updateTalentAction({}, formData)
    }

    const updates = talentUpdates()

    expect(updates).toHaveLength(2)
    expect(updates[0]?.body).toMatchObject({ reading: 'がぱ' })
    expect(updates[1]?.body).toMatchObject({ reading: 'がぱ' })
  })

  it('should save an empty reading as null', async () => {
    mockTalentUpdate()

    const formData = new FormData()
    formData.append('id', TALENT_ID)
    formData.append('name', 'Updated Talent')
    formData.append('reading', '   ')

    const result = await updateTalentAction({}, formData)

    expect(result).toEqual({ success: true })
    expect(talentUpdates()[0]?.body).toEqual(
      expect.objectContaining({ reading: null }),
    )
  })

  it.each([
    ['katakana', 'シンジュ'],
    ['kanji', '真珠'],
    ['latin letters', 'shinju'],
  ])('should reject a reading in %s', async (_, reading) => {
    mockTalentUpdate()

    const formData = new FormData()
    formData.append('id', TALENT_ID)
    formData.append('name', 'Updated Talent')
    formData.append('reading', reading)

    const result = await updateTalentAction({}, formData)

    expect(result).toEqual({
      errors: {
        reading: ['読み仮名はひらがなと長音符（ー）で入力してください。'],
      },
    })
    expect(talentUpdates()).toHaveLength(0)
  })

  it('should handle database errors other than a missing row', async () => {
    supabase.on('update', 'talents', databaseErrorResponse())

    const formData = new FormData()
    formData.append('id', TALENT_ID)
    formData.append('name', 'Updated Talent')

    const result = await updateTalentAction({}, formData)

    // 予期しないエラーの文は画面に出さない
    expect(result).toEqual({ error: ACTION_FAILED_ERROR })
    expect(test.logger.error).toHaveBeenCalledWith(
      'Server Action が失敗しました',
      { action: 'updateTalentAction', error: DATABASE_ERROR },
    )
  })
})

interface LifecycleActionCase {
  name: string
  action: (id: string) => Promise<{ success: boolean; error?: string }>
  auditAction: AuditAction
  expectedUpdate: Record<string, unknown>
  /** 遷移前の status 条件（null は status で絞り込まない） */
  expectedStatusFilter: 'active' | 'retired' | null
  /** 遷移前の deleted_at 条件 */
  expectedDeletedAtFilter: 'is null' | 'is not null'
  notFoundWarning: string
  notFoundError: string
}

const lifecycleActionCases: LifecycleActionCase[] = [
  {
    action: deleteTalentAction,
    auditAction: 'CHANNEL_DELETE',
    expectedDeletedAtFilter: 'is null',
    expectedStatusFilter: null,
    expectedUpdate: { deleted_at: NOW },
    name: 'deleteTalentAction',
    notFoundError:
      '指定されたタレントが見つかりません。既に削除されているか、存在しないIDが指定されています。',
    notFoundWarning: '削除対象のタレントが見つかりませんでした',
  },
  {
    action: restoreTalentAction,
    auditAction: 'CHANNEL_RESTORE',
    expectedDeletedAtFilter: 'is not null',
    expectedStatusFilter: null,
    expectedUpdate: { deleted_at: null },
    name: 'restoreTalentAction',
    notFoundError:
      '指定されたタレントが見つかりません。既に復活しているか、存在しないIDが指定されています。',
    notFoundWarning: '復活対象のタレントが見つかりませんでした',
  },
  {
    action: retireTalentAction,
    auditAction: 'CHANNEL_RETIRE',
    expectedDeletedAtFilter: 'is null',
    expectedStatusFilter: 'active',
    expectedUpdate: { status: 'retired' },
    name: 'retireTalentAction',
    notFoundError:
      '指定されたタレントが見つかりません。既に引退・削除されているか、存在しないIDが指定されています。',
    notFoundWarning: '引退対象のタレントが見つかりませんでした',
  },
  {
    action: activateTalentAction,
    auditAction: 'CHANNEL_ACTIVATE',
    expectedDeletedAtFilter: 'is null',
    expectedStatusFilter: 'retired',
    expectedUpdate: { status: 'active' },
    name: 'activateTalentAction',
    notFoundError:
      '指定されたタレントが見つかりません。既にアクティブ・削除されているか、存在しないIDが指定されています。',
    notFoundWarning: 'アクティブ化対象のタレントが見つかりませんでした',
  },
]

describe.each(lifecycleActionCases)('$name', (testCase) => {
  it('should update the talent and record an audit log', async () => {
    mockTalentUpdate('Test Talent')

    const result = await testCase.action(TALENT_ID)

    expect(result).toEqual({ success: true })
    expect(talentUpdates()).toHaveLength(1)
    expect(talentUpdates()[0]?.body).toEqual(testCase.expectedUpdate)
    expect(talentUpdates()[0]?.query['select']).toBe('name')
    test.expectAuditLog(testCase.auditAction, TALENT_ID, {
      entityName: 'Test Talent',
    })
    test.expectRevalidated({
      paths: ['/talents', `/talents/${TALENT_ID}`],
      tags: [['talents', 'videos']],
    })
  })

  it('should only target talents in the expected source state', async () => {
    mockTalentUpdate('Test Talent')

    await testCase.action(TALENT_ID)

    // Every filter of the update, without the `select` of the returned row
    const filters = [...(talentUpdates()[0]?.searchParams ?? [])].filter(
      ([column]) => column !== 'select',
    )
    const expectedFilters: [string, string][] = [['id', `eq.${TALENT_ID}`]]

    if (testCase.expectedStatusFilter) {
      expectedFilters.push(['status', `eq.${testCase.expectedStatusFilter}`])
    }

    expectedFilters.push(
      testCase.expectedDeletedAtFilter === 'is null'
        ? ['deleted_at', 'is.null']
        : ['deleted_at', 'not.is.null'],
    )

    expect(filters).toEqual(expect.arrayContaining(expectedFilters))
    expect(filters).toHaveLength(expectedFilters.length)
  })

  it('should return error when talent is not found', async () => {
    // No row matches, so `.single()` fails
    supabase.on('update', 'talents', [])

    const result = await testCase.action(TALENT_ID)

    expect(result).toEqual({
      error: testCase.notFoundError,
      success: false,
    })
    expect(test.logger.warn).toHaveBeenCalledWith(testCase.notFoundWarning, {
      id: TALENT_ID,
    })
    expect(test.logger.error).not.toHaveBeenCalled()
    test.expectNoAuditLog()
    expect(test.revalidateTags).not.toHaveBeenCalled()
  })

  it.each([
    ['no ID', ''],
    ['an ID that is not a UUID', 'talent-1'],
    ['a value that is not a string', ['123e4567-e89b-12d3-a456-426614174000']],
  ])('should return error without updating anything for %s', async (_, id) => {
    mockTalentUpdate('Test Talent')

    const result = await testCase.action(id as string)

    expect(result).toEqual({
      error: '入力が正しくありません。',
      success: false,
    })
    expect(supabase.requests).toHaveLength(0)
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })

  it('should handle database errors other than a missing row', async () => {
    supabase.on('update', 'talents', databaseErrorResponse())

    const result = await testCase.action(TALENT_ID)

    // 予期しないエラーの文は画面に出さない
    expect(result).toEqual({
      error: ACTION_FAILED_ERROR,
      success: false,
    })
    expect(test.logger.error).toHaveBeenCalledWith(
      'Server Action が失敗しました',
      { action: testCase.name, args: [TALENT_ID], error: DATABASE_ERROR },
    )
    test.expectNoAuditLog()
    expect(test.revalidateTags).not.toHaveBeenCalled()
  })
})

describe('createTalentAction', () => {
  it('should successfully create talent', async () => {
    supabase.on(
      'insert',
      'talents',
      createTalent({ id: TALENT_ID, name: 'New Talent' }),
    )

    const formData = new FormData()
    formData.append('name', 'New Talent')

    const result = await createTalentAction({}, formData)

    expect(result).toEqual({ success: true })
    expect(supabase.calls('insert', 'talents')[0]?.body).toEqual({
      name: 'New Talent',
      reading: null,
    })
    test.expectAuditLog('CHANNEL_CREATE', TALENT_ID, {
      entityName: 'New Talent',
    })
    test.expectRevalidated({
      paths: ['/talents'],
      tags: [['talents', 'videos']],
    })
  })

  it('should add the YouTube channel with its icon', async () => {
    const youtubeChannel = {
      contentDetails: {
        relatedPlaylists: { uploads: 'UUabcdefghijklmnopqrstuv' },
      },
      id: 'UCabcdefghijklmnopqrstuv',
      snippet: { customUrl: '@example', title: 'Example Channel' },
    }

    vi.mocked(resolveYouTubeChannel).mockResolvedValue(youtubeChannel as never)

    supabase.on(
      'insert',
      'talents',
      createTalent({ id: TALENT_ID, name: 'New Talent' }),
    )
    supabase.on('insert', 'youtube_channels', {
      id: 'channel-row-1',
      name: 'Example Channel',
      talent: { name: 'New Talent' },
      youtube_channel_id: youtubeChannel.id,
      youtube_handle: '@example',
    })

    const formData = new FormData()
    formData.append('name', 'New Talent')
    formData.append('youtube_channel_id', youtubeChannel.id)

    const result = await createTalentAction({}, formData)

    expect(result).toEqual({ success: true })
    expect(supabase.calls('insert', 'youtube_channels')[0]?.body).toEqual({
      name: 'Example Channel',
      talent_id: TALENT_ID,
      youtube_channel_id: youtubeChannel.id,
      youtube_handle: '@example',
    })
    expect(syncYouTubeChannelIconSafely).toHaveBeenCalledWith(youtubeChannel, {
      id: 'channel-row-1',
      profile_images: null,
      youtube_channel_id: youtubeChannel.id,
    })
    test.expectAuditLog('YOUTUBE_CHANNEL_CREATE', TALENT_ID, {
      account: {
        id: 'channel-row-1',
        name: 'Example Channel',
        youtube_channel_id: youtubeChannel.id,
        youtube_handle: '@example',
      },
      entityName: 'New Talent',
    })
    test.expectAuditLog('CHANNEL_CREATE', TALENT_ID, {
      entityName: 'New Talent',
    })
  })

  describe('with a YouTube channel', () => {
    const youtubeChannel = {
      contentDetails: {
        relatedPlaylists: { uploads: 'UUabcdefghijklmnopqrstuv' },
      },
      id: 'UCabcdefghijklmnopqrstuv',
      snippet: { customUrl: '@example', title: 'Example Channel' },
    }

    function channelFormData(): FormData {
      const formData = new FormData()
      formData.append('name', 'New Talent')
      formData.append('youtube_channel_id', youtubeChannel.id)
      return formData
    }

    function expectNothingCompleted(): void {
      test.expectNoAuditLog()
      test.expectNotRevalidated()
      expect(syncYouTubeChannelIconSafely).not.toHaveBeenCalled()
    }

    beforeEach(() => {
      vi.mocked(resolveYouTubeChannel).mockResolvedValue(
        youtubeChannel as never,
      )
    })

    it('should not create the talent when the channel is not on YouTube', async () => {
      vi.mocked(resolveYouTubeChannel).mockResolvedValue(null)

      const result = await createTalentAction({}, channelFormData())

      expect(result).toEqual({
        errors: {
          youtube_channel_id: [
            'YouTubeでチャンネルが見つかりませんでした。入力内容を確認してください。',
          ],
        },
      })
      expect(supabase.requests).toHaveLength(0)
      expectNothingCompleted()
    })

    it('should not create the talent when the channel input is not understood', async () => {
      const formData = channelFormData()
      formData.set('youtube_channel_id', 'ab')

      const result = await createTalentAction({}, formData)

      expect(result).toEqual({
        errors: {
          youtube_channel_id: [
            '有効なチャンネルID（UC...）、ハンドル（@name）、またはYouTube URLを入力してください。',
          ],
        },
      })
      expect(resolveYouTubeChannel).not.toHaveBeenCalled()
      expect(supabase.requests).toHaveLength(0)
      expectNothingCompleted()
    })

    it('should not create the talent when the YouTube API key is missing', async () => {
      vi.mocked(resolveYouTubeChannel).mockRejectedValue(
        new TypeError('An API Key is required.'),
      )

      const result = await createTalentAction({}, channelFormData())

      expect(result).toEqual({
        errors: {
          generic: [
            'YouTube APIキーが設定されていません。管理者に連絡してください。',
          ],
        },
      })
      expect(supabase.requests).toHaveLength(0)
      expectNothingCompleted()
    })

    it('should not create the talent when the channel is already registered', async () => {
      supabase.on(
        'select',
        'youtube_channels',
        createYouTubeChannel({
          talent_id: 'other-talent-id',
          youtube_channel_id: youtubeChannel.id,
        }),
      )

      const result = await createTalentAction({}, channelFormData())

      expect(result).toEqual({
        errors: {
          youtube_channel_id: [
            'このチャンネルは別のタレントに既に登録されています。',
          ],
        },
      })
      expect(
        supabase.calls('select', 'youtube_channels')[0]?.query[
          'youtube_channel_id'
        ],
      ).toBe(`eq.${youtubeChannel.id}`)
      expect(supabase.calls('insert', 'talents')).toHaveLength(0)
      expect(supabase.calls('insert', 'youtube_channels')).toHaveLength(0)
      expectNothingCompleted()
    })

    it('should delete the created talent when the channel was registered in the meantime', async () => {
      // タレントを作る前の確認では登録されておらず、チャンネルの行を作るときには登録されている
      supabase.once('select', 'youtube_channels', [])
      supabase.on(
        'select',
        'youtube_channels',
        createYouTubeChannel({
          talent_id: 'other-talent-id',
          youtube_channel_id: youtubeChannel.id,
        }),
      )
      supabase.on(
        'insert',
        'talents',
        createTalent({ id: TALENT_ID, name: 'New Talent' }),
      )
      supabase.on(
        'insert',
        'youtube_channels',
        postgresError('23505', 'duplicate key value'),
      )

      const result = await createTalentAction({}, channelFormData())

      expect(result).toEqual({
        errors: {
          youtube_channel_id: [
            'このチャンネルは別のタレントに既に登録されています。',
          ],
        },
      })
      expect(supabase.calls('delete', 'talents')).toHaveLength(1)
      expect(supabase.calls('delete', 'talents')[0]?.query['id']).toBe(
        `eq.${TALENT_ID}`,
      )
      expectNothingCompleted()
    })

    it('should delete the created talent when the channel cannot be added', async () => {
      supabase.on(
        'insert',
        'talents',
        createTalent({ id: TALENT_ID, name: 'New Talent' }),
      )
      supabase.on('insert', 'youtube_channels', databaseErrorResponse())

      const result = await createTalentAction({}, channelFormData())

      expect(result).toEqual({
        errors: {
          youtube_channel_id: [
            'YouTubeチャンネルの登録に失敗しました。しばらくしてから再度お試しください。',
          ],
        },
      })
      expect(supabase.calls('delete', 'talents')[0]?.query['id']).toBe(
        `eq.${TALENT_ID}`,
      )
      expect(test.logger.error).toHaveBeenCalledWith(
        'youtube_channelsテーブルへの書き込みに失敗しました',
        { error: DATABASE_ERROR, youtube_channel_id: youtubeChannel.id },
      )
      expectNothingCompleted()
    })

    it('should log when the created talent cannot be deleted', async () => {
      supabase.on(
        'insert',
        'talents',
        createTalent({ id: TALENT_ID, name: 'New Talent' }),
      )
      supabase.on('insert', 'youtube_channels', databaseErrorResponse())
      supabase.on('delete', 'talents', databaseErrorResponse())

      const result = await createTalentAction({}, channelFormData())

      expect(result.errors?.['youtube_channel_id']).toBeDefined()
      expect(test.logger.error).toHaveBeenCalledWith(
        '作成したタレントの削除に失敗しました',
        { error: DATABASE_ERROR, id: TALENT_ID },
      )
      expectNothingCompleted()
    })
  })

  it('should create the talent with the normalized reading', async () => {
    supabase.on(
      'insert',
      'talents',
      createTalent({ id: TALENT_ID, name: 'New Talent' }),
    )

    const formData = new FormData()
    formData.append('name', ' New Talent ')
    formData.append('reading', ' がー ')

    const result = await createTalentAction({}, formData)

    expect(result).toEqual({ success: true })
    expect(supabase.calls('insert', 'talents')[0]?.body).toEqual({
      name: 'New Talent',
      reading: 'がー',
    })
  })

  it('should reject a reading that is not in hiragana before calling YouTube', async () => {
    const formData = new FormData()
    formData.append('name', 'New Talent')
    formData.append('reading', 'ニュータレント')
    formData.append('youtube_channel_id', 'UCabcdefghijklmnopqrstuv')

    const result = await createTalentAction({}, formData)

    expect(result).toEqual({
      errors: {
        reading: ['読み仮名はひらがなと長音符（ー）で入力してください。'],
      },
    })
    expect(resolveYouTubeChannel).not.toHaveBeenCalled()
    expect(supabase.requests).toHaveLength(0)
  })

  it('should return error when name is empty', async () => {
    const formData = new FormData()
    formData.append('name', '')

    const result = await createTalentAction({}, formData)

    expect(result).toEqual({
      errors: {
        name: ['タレント名を入力してください。'],
      },
    })
  })

  it('should handle database errors', async () => {
    supabase.on('insert', 'talents', databaseErrorResponse())

    const formData = new FormData()
    formData.append('name', 'New Talent')

    const result = await createTalentAction({}, formData)

    // 予期しないエラーの文は画面に出さない
    expect(result).toEqual({ error: ACTION_FAILED_ERROR })
    expect(test.logger.error).toHaveBeenCalledWith(
      'Server Action が失敗しました',
      { action: 'createTalentAction', error: DATABASE_ERROR },
    )
  })
})
