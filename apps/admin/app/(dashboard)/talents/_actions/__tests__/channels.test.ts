import { resolveYouTubeChannel } from '@shinju-date/youtube-api-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncYouTubeChannelIconSafely } from '@/lib/youtube-channel-icon'
import { setupActionTest } from '@/test/action-harness'
import { postgresError } from '@/test/supabase'
import {
  addYouTubeChannelAction,
  removeYouTubeChannelAction,
} from '../channels'

vi.mock('@shinju-date/youtube-api-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@shinju-date/youtube-api-client')>()
  return {
    ...actual,
    resolveYouTubeChannel: vi.fn(),
  }
})

// アイコンの同期は service role を使うため、ここではモックして呼び出し内容だけを確認する
vi.mock('@/lib/youtube-channel-icon', () => ({
  hasProfileImageChanged: (result: string | null) =>
    result !== null && result !== 'unchanged',
  syncYouTubeChannelIconSafely: vi.fn().mockResolvedValue('unchanged'),
}))

const test = setupActionTest()
const { supabase } = test

vi.spyOn(Temporal.Now, 'instant').mockReturnValue(
  Temporal.Instant.from('2024-11-24T17:00:00Z'),
)

const talentId = '123e4567-e89b-12d3-a456-426614174000'
const youtubeChannelId = 'UCabcdefghijklmnopqrstuv'
const newChannelId = 'channel-123'

const mockYouTubeChannel = {
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

function createFormData(fields: Record<string, string>): FormData {
  const formData = new FormData()

  for (const [name, value] of Object.entries(fields)) {
    formData.append(name, value)
  }

  return formData
}

/** Lets the insert of the new channel succeed and return its id. */
function answerInsert(): void {
  supabase.on('insert', 'youtube_channels', { id: newChannelId })
}

/** The rows the action inserted into `youtube_channels`. */
function insertedRows(): unknown[] {
  return supabase
    .calls('insert', 'youtube_channels')
    .map((request) => request.body)
}

describe('addYouTubeChannelAction', () => {
  beforeEach(() => {
    vi.mocked(resolveYouTubeChannel).mockResolvedValue(
      mockYouTubeChannel as never,
    )
  })

  it('should successfully add YouTube channel with name and handle from API', async () => {
    answerInsert()

    const result = await addYouTubeChannelAction(
      {},
      createFormData({
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
      }),
    )

    expect(result).toEqual({ success: true })
    expect(resolveYouTubeChannel).toHaveBeenCalledWith({
      id: youtubeChannelId,
      kind: 'id',
    })
    expect(insertedRows()).toEqual([
      {
        name: 'Example Channel',
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
        youtube_handle: '@example_handle',
      },
    ])
    test.expectAuditLog(
      'YOUTUBE_CHANNEL_CREATE',
      'youtube_channels',
      newChannelId,
      {
        name: 'Example Channel',
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
        youtube_handle: '@example_handle',
      },
    )
    test.expectRevalidated({
      paths: [`/talents/${talentId}`, '/talents'],
      tags: [['talents', 'videos']],
    })
  })

  it('should fetch the icon of the added channel', async () => {
    // アイコンの同期に失敗しても（null）、チャンネルの追加は成功する
    vi.mocked(syncYouTubeChannelIconSafely).mockResolvedValueOnce(null)
    answerInsert()

    const result = await addYouTubeChannelAction(
      {},
      createFormData({
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
      }),
    )

    expect(result).toEqual({ success: true })
    expect(syncYouTubeChannelIconSafely).toHaveBeenCalledWith(
      mockYouTubeChannel,
      {
        id: newChannelId,
        profile_images: null,
        youtube_channel_id: youtubeChannelId,
      },
    )
  })

  it('should resolve channel from handle input', async () => {
    answerInsert()

    const result = await addYouTubeChannelAction(
      {},
      createFormData({
        talent_id: talentId,
        youtube_channel_id: 'https://www.youtube.com/@example_handle',
      }),
    )

    expect(result).toEqual({ success: true })
    expect(resolveYouTubeChannel).toHaveBeenCalledWith({
      handle: 'example_handle',
      kind: 'handle',
    })
    expect(insertedRows()).toEqual([
      {
        name: 'Example Channel',
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
        youtube_handle: '@example_handle',
      },
    ])
  })

  it('should extract channel ID from channel URL', async () => {
    answerInsert()

    const result = await addYouTubeChannelAction(
      {},
      createFormData({
        talent_id: talentId,
        youtube_channel_id: `https://www.youtube.com/channel/${youtubeChannelId}`,
      }),
    )

    expect(result).toEqual({ success: true })
    expect(resolveYouTubeChannel).toHaveBeenCalledWith({
      id: youtubeChannelId,
      kind: 'id',
    })
  })

  it('should return error when talent_id is missing', async () => {
    const result = await addYouTubeChannelAction(
      {},
      createFormData({ youtube_channel_id: youtubeChannelId }),
    )

    expect(result).toEqual({
      errors: {
        generic: ['タレントIDが指定されていません。'],
      },
    })
  })

  it('should return error when youtube_channel_id is missing', async () => {
    const result = await addYouTubeChannelAction(
      {},
      createFormData({ talent_id: talentId, youtube_channel_id: '' }),
    )

    expect(result).toEqual({
      errors: {
        youtube_channel_id: [
          'YouTubeチャンネルID、ハンドル、またはURLを入力してください。',
        ],
      },
    })
  })

  it('should return error for invalid youtube_channel_id format', async () => {
    const result = await addYouTubeChannelAction(
      {},
      // Too short for a handle; not a UC channel ID
      createFormData({ talent_id: talentId, youtube_channel_id: 'ab' }),
    )

    expect(result).toEqual({
      errors: {
        youtube_channel_id: [
          '有効なチャンネルID（UC...）、ハンドル（@name）、またはYouTube URLを入力してください。',
        ],
      },
    })
  })

  it('should return error when YouTube channel is not found', async () => {
    vi.mocked(resolveYouTubeChannel).mockResolvedValue(null)

    const result = await addYouTubeChannelAction(
      {},
      createFormData({
        talent_id: talentId,
        youtube_channel_id: '@missing_handle',
      }),
    )

    expect(result).toEqual({
      errors: {
        youtube_channel_id: [
          'YouTubeでチャンネルが見つかりませんでした。入力内容を確認してください。',
        ],
      },
    })
  })

  it('should return error when API key is missing', async () => {
    vi.mocked(resolveYouTubeChannel).mockRejectedValue(
      new TypeError('An API Key is required.'),
    )

    const result = await addYouTubeChannelAction(
      {},
      createFormData({
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
      }),
    )

    expect(result).toEqual({
      errors: {
        generic: [
          'YouTube APIキーが設定されていません。管理者に連絡してください。',
        ],
      },
    })
  })

  it('should return error when channel already exists for this talent', async () => {
    supabase.on('select', 'youtube_channels', {
      id: 'existing-channel',
      talent_id: talentId,
    })

    const result = await addYouTubeChannelAction(
      {},
      createFormData({
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
      }),
    )

    expect(result).toEqual({
      errors: {
        youtube_channel_id: ['このチャンネルは既に登録されています。'],
      },
    })
  })

  it('should return error when channel belongs to another talent', async () => {
    supabase.on('select', 'youtube_channels', {
      id: 'existing-channel',
      talent_id: 'other-talent-id',
    })

    const result = await addYouTubeChannelAction(
      {},
      createFormData({
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
      }),
    )

    expect(result).toEqual({
      errors: {
        youtube_channel_id: [
          'このチャンネルは別のタレントに既に登録されています。',
        ],
      },
    })
  })
})

describe('removeYouTubeChannelAction', () => {
  it('should successfully remove YouTube channel', async () => {
    supabase.on('select', 'youtube_channels', {
      youtube_channel_id: youtubeChannelId,
    })

    const result = await removeYouTubeChannelAction('channel-123', talentId)

    expect(result).toEqual({ success: true })
    test.expectAuditLog(
      'YOUTUBE_CHANNEL_DELETE',
      'youtube_channels',
      'channel-123',
      {
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
      },
    )
    test.expectRevalidated({
      paths: [`/talents/${talentId}`, '/talents'],
      tags: [['talents', 'videos']],
    })
  })

  it('should return error when channel is not found (PGRST116)', async () => {
    // No row matches, so `.single()` fails with PGRST116
    supabase.on('select', 'youtube_channels', [])

    const result = await removeYouTubeChannelAction('channel-123', talentId)

    expect(result).toEqual({
      error:
        '指定されたチャンネルが見つかりません。既に削除されているか、存在しないIDが指定されています。',
      success: false,
    })
    expect(test.logger.warn).toHaveBeenCalledWith(
      '削除対象のチャンネルが見つかりませんでした',
      {
        channel_id: 'channel-123',
        talent_id: talentId,
      },
    )
  })

  it('should return error when channelId or talentId is missing', async () => {
    const result1 = await removeYouTubeChannelAction('', 'talent-id')
    expect(result1).toEqual({
      error: 'チャンネルIDまたはタレントIDが指定されていません。',
      success: false,
    })

    const result2 = await removeYouTubeChannelAction('channel-id', '')
    expect(result2).toEqual({
      error: 'チャンネルIDまたはタレントIDが指定されていません。',
      success: false,
    })
  })

  it('should handle delete operation errors', async () => {
    supabase.on('select', 'youtube_channels', {
      youtube_channel_id: youtubeChannelId,
    })
    supabase.on(
      'delete',
      'youtube_channels',
      postgresError('XX000', 'Delete failed'),
    )

    const result = await removeYouTubeChannelAction('channel-123', talentId)

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(test.logger.error).toHaveBeenCalled()
  })
})
