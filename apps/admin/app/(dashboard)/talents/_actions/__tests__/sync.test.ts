import { getUsers } from '@shinju-date/twitch-api-client'
import { getChannels } from '@shinju-date/youtube-api-client'
import { describe, expect, it, vi } from 'vitest'
import { syncTwitchUserIconSafely } from '@/lib/twitch-user-icon'
import { syncYouTubeChannelIconSafely } from '@/lib/youtube-channel-icon'
import { setupActionTest } from '@/test/action-harness'
import { postgresError } from '@/test/supabase'
import {
  syncTalentAccounts,
  syncTalentWithTwitch,
  syncTalentWithYouTube,
} from '../sync'

const test = setupActionTest()
const { supabase } = test

vi.spyOn(Temporal.Now, 'instant').mockReturnValue(
  Temporal.Instant.from('2024-11-24T17:00:00Z'),
)

vi.mock('@shinju-date/youtube-api-client', () => ({
  getChannels: vi.fn(),
}))

vi.mock('@shinju-date/twitch-api-client', () => ({
  getUsers: vi.fn(),
}))

// アイコンの同期は service role を使うため、ここではモックして呼び出し内容だけを確認する
vi.mock('@/lib/youtube-channel-icon', () => ({
  hasProfileImageChanged: (result: string | null) =>
    result !== null && result !== 'unchanged',
  syncYouTubeChannelIconSafely: vi.fn().mockResolvedValue('unchanged'),
}))

vi.mock('@/lib/twitch-user-icon', () => ({
  syncTwitchUserIconSafely: vi.fn().mockResolvedValue('unchanged'),
}))

const talentId = '123e4567-e89b-12d3-a456-426614174000'
const channelRowId = 'channel-row-uuid'
const channelRowId2 = 'channel-row-uuid-2'
const youtubeChannelId = 'UCabcdefghijklmnopqrstuv'
const youtubeChannelId2 = 'UCabcdefghijklmnopqrstuw'
const twitchUserRowId = 'twitch-user-row-uuid'
const twitchUserId = '141981764'

// supabase-js removes the whitespace from `select()` before sending it
const PROFILE_IMAGES_SELECT = 'profile_images(id,path,etag,source_url)'

const YOUTUBE_CHANNEL_NOT_FOUND_ERROR =
  'YouTubeでチャンネルが見つかりませんでした。チャンネルIDが正しいか確認してください。'
const TWITCH_USER_NOT_FOUND_ERROR =
  'Twitchでユーザーが見つかりませんでした。ユーザーIDが正しいか確認してください。'

interface SavedProfileImage {
  etag: string | null
  id: string
  path: string
  source_url: string
}

interface SavedChannel {
  id: string
  name: string | null
  profile_images: SavedProfileImage | null
  youtube_channel_id: string
  youtube_handle: string | null
}

interface SavedUser {
  id: string
  name: string | null
  profile_images: SavedProfileImage | null
  twitch_login_name: string | null
  twitch_user_id: string
}

/** A `youtube_channels` row embedded in the talent. */
function savedChannel(overrides: Partial<SavedChannel> = {}): SavedChannel {
  return {
    id: channelRowId,
    name: null,
    profile_images: null,
    youtube_channel_id: youtubeChannelId,
    youtube_handle: null,
    ...overrides,
  }
}

/** A `twitch_users` row embedded in the talent. */
function savedUser(overrides: Partial<SavedUser> = {}): SavedUser {
  return {
    id: twitchUserRowId,
    name: 'Old Name',
    profile_images: null,
    twitch_login_name: 'oldlogin',
    twitch_user_id: twitchUserId,
    ...overrides,
  }
}

interface TalentAccounts {
  twitch_users?: SavedUser[]
  youtube_channels?: SavedChannel[]
}

/** Answers the talent query with these linked accounts. */
function answerTalent(accounts: TalentAccounts): void {
  supabase.on('select', 'talents', { id: talentId, ...accounts })
}

interface YouTubeThumbnail {
  height: number
  url: string
  width: number
}

interface YouTubeChannelOptions {
  customUrl?: string
  id?: string
  thumbnails?: Record<string, YouTubeThumbnail>
  title?: string
}

function youtubeChannel({
  customUrl,
  id = youtubeChannelId,
  thumbnails,
  title,
}: YouTubeChannelOptions) {
  return {
    contentDetails: {
      relatedPlaylists: { uploads: `UU${id.slice(2)}` },
    },
    id,
    snippet: { customUrl, thumbnails, title },
  }
}

function helixUser(
  displayName: string,
  login: string,
  profileImageUrl = '',
): Record<string, string> {
  return {
    broadcaster_type: '',
    created_at: '2011-08-08T20:45:44Z',
    description: '',
    display_name: displayName,
    id: twitchUserId,
    login,
    offline_image_url: '',
    profile_image_url: profileImageUrl,
    type: '',
  }
}

/** Makes the YouTube API return these channels. */
function answerChannels(...channels: unknown[]): void {
  vi.mocked(getChannels).mockReturnValue(
    (async function* () {
      yield* channels
    })() as never,
  )
}

/** Makes the Helix API return these users. */
function answerUsers(...users: unknown[]): void {
  vi.mocked(getUsers).mockReturnValue(
    (async function* () {
      yield* users
    })() as never,
  )
}

function talentSelect(): string | undefined {
  return supabase.calls('select', 'talents')[0]?.query['select']
}

function talentUpdates() {
  return supabase.calls('update', 'talents')
}

describe('syncTalentWithYouTube', () => {
  it('should update channel name and handle from YouTube snippet', async () => {
    answerTalent({
      youtube_channels: [
        savedChannel({
          name: 'Old Channel Name',
          youtube_handle: '@oldhandle',
        }),
      ],
    })
    answerChannels(
      youtubeChannel({ customUrl: '@newhandle', title: 'New Channel Name' }),
    )

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({ success: true })
    expect(getChannels).toHaveBeenCalledWith({ ids: [youtubeChannelId] })
    const upserts = supabase.calls('upsert', 'youtube_channels')
    expect(upserts).toHaveLength(1)
    expect(upserts[0]?.body).toEqual({
      id: channelRowId,
      name: 'New Channel Name',
      talent_id: talentId,
      youtube_channel_id: youtubeChannelId,
      youtube_handle: '@newhandle',
    })
    expect(upserts[0]?.query['on_conflict']).toBe('id')
    // Talent name is not updated; only updated_at is touched
    expect(talentUpdates()[0]?.body).toEqual({
      updated_at: '2024-11-24T17:00:00Z',
    })
    test.expectAuditLog('CHANNEL_SYNC', talentId, {
      channels: [
        {
          after: {
            name: 'New Channel Name',
            youtube_handle: '@newhandle',
          },
          before: {
            name: 'Old Channel Name',
            youtube_handle: '@oldhandle',
          },
          youtube_channel_id: youtubeChannelId,
        },
      ],
    })
    test.expectRevalidated({
      paths: [`/talents/${talentId}`, '/talents'],
      tags: [['talents', 'videos']],
    })
  })

  it('should select the saved icon of each channel', async () => {
    answerTalent({ youtube_channels: [] })
    answerChannels()

    await syncTalentWithYouTube(talentId)

    expect(talentSelect()).toEqual(
      expect.stringContaining(PROFILE_IMAGES_SELECT),
    )
  })

  it('should record a changed icon even when name and handle are unchanged', async () => {
    const channel = savedChannel({
      name: 'Same Name',
      youtube_handle: '@same',
    })
    const apiChannel = youtubeChannel({
      customUrl: '@same',
      thumbnails: {
        high: { height: 800, url: 'https://yt3.ggpht.com/a', width: 800 },
      },
      title: 'Same Name',
    })
    answerTalent({ youtube_channels: [channel] })
    answerChannels(apiChannel)
    vi.mocked(syncYouTubeChannelIconSafely).mockResolvedValueOnce('created')

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({ success: true })
    expect(syncYouTubeChannelIconSafely).toHaveBeenCalledWith(
      apiChannel,
      channel,
    )
    expect(talentUpdates()).not.toHaveLength(0)
    test.expectAuditLog('CHANNEL_SYNC', talentId, {
      channels: [
        {
          after: { name: 'Same Name', youtube_handle: '@same' },
          before: { name: 'Same Name', youtube_handle: '@same' },
          profile_image: 'created',
          youtube_channel_id: youtubeChannelId,
        },
      ],
    })
  })

  it('should still sync name and handle when the icon cannot be synced', async () => {
    answerTalent({
      youtube_channels: [
        savedChannel({ name: 'Old Name', youtube_handle: '@old' }),
      ],
    })
    answerChannels(youtubeChannel({ customUrl: '@new', title: 'New Name' }))
    // 失敗時はヘルパーがログに記録して null を返す
    vi.mocked(syncYouTubeChannelIconSafely).mockResolvedValueOnce(null)

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({ success: true })
    expect(supabase.calls('upsert', 'youtube_channels')).not.toHaveLength(0)
    test.expectAuditLog('CHANNEL_SYNC', talentId, {
      channels: [
        {
          after: { name: 'New Name', youtube_handle: '@new' },
          before: { name: 'Old Name', youtube_handle: '@old' },
          youtube_channel_id: youtubeChannelId,
        },
      ],
    })
  })

  it('should sync all linked YouTube channels', async () => {
    answerTalent({
      youtube_channels: [
        savedChannel({ name: 'Channel A', youtube_handle: '@channela' }),
        savedChannel({
          id: channelRowId2,
          youtube_channel_id: youtubeChannelId2,
        }),
      ],
    })
    answerChannels(
      youtubeChannel({
        customUrl: '@channela-updated',
        title: 'Channel A Updated',
      }),
      youtubeChannel({
        customUrl: '@channelb',
        id: youtubeChannelId2,
        title: 'Channel B',
      }),
    )

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({ success: true })
    expect(getChannels).toHaveBeenCalledWith({
      ids: [youtubeChannelId, youtubeChannelId2],
    })
    const upserts = supabase.calls('upsert', 'youtube_channels')
    expect(upserts).toHaveLength(2)
    expect(upserts.map((request) => request.body)).toEqual([
      {
        id: channelRowId,
        name: 'Channel A Updated',
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
        youtube_handle: '@channela-updated',
      },
      {
        id: channelRowId2,
        name: 'Channel B',
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId2,
        youtube_handle: '@channelb',
      },
    ])
    expect(upserts.map((request) => request.query['on_conflict'])).toEqual([
      'id',
      'id',
    ])
    test.expectAuditLog('CHANNEL_SYNC', talentId, {
      channels: [
        {
          after: {
            name: 'Channel A Updated',
            youtube_handle: '@channela-updated',
          },
          before: {
            name: 'Channel A',
            youtube_handle: '@channela',
          },
          youtube_channel_id: youtubeChannelId,
        },
        {
          after: {
            name: 'Channel B',
            youtube_handle: '@channelb',
          },
          before: {
            name: null,
            youtube_handle: null,
          },
          youtube_channel_id: youtubeChannelId2,
        },
      ],
    })
  })

  it('should update found channels when some are missing on YouTube', async () => {
    answerTalent({
      youtube_channels: [
        savedChannel({ name: 'Channel A', youtube_handle: '@channela' }),
        savedChannel({
          id: channelRowId2,
          name: 'Missing Channel',
          youtube_channel_id: youtubeChannelId2,
          youtube_handle: '@missing',
        }),
      ],
    })
    answerChannels(
      youtubeChannel({ customUrl: '@channela-new', title: 'Channel A New' }),
    )

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({ success: true })
    expect(supabase.calls('upsert', 'youtube_channels')).toHaveLength(1)
    expect(test.logger.warn).toHaveBeenCalledWith(
      'YouTubeでチャンネルが見つかりませんでした',
      {
        talentId,
        youtubeChannelId: youtubeChannelId2,
      },
    )
  })

  it('should return already up to date when channel data is unchanged', async () => {
    answerTalent({
      youtube_channels: [
        savedChannel({ name: 'Same Name', youtube_handle: '@same' }),
      ],
    })
    answerChannels(youtubeChannel({ customUrl: '@same', title: 'Same Name' }))

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({
      message: 'チャンネル情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    // Still upserts (idempotent write) but does not touch talent or audit
    expect(supabase.calls('upsert', 'youtube_channels')).not.toHaveLength(0)
    expect(talentUpdates()).toHaveLength(0)
    test.expectNoAuditLog()
  })

  it('should return channel not found when YouTube API returns no channels', async () => {
    answerTalent({ youtube_channels: [savedChannel()] })
    answerChannels()

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({
      error: YOUTUBE_CHANNEL_NOT_FOUND_ERROR,
      success: false,
    })
  })

  it('should return error when snippet title is missing for all channels', async () => {
    answerTalent({ youtube_channels: [savedChannel()] })
    answerChannels({ ...youtubeChannel({}), snippet: {} })

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({
      error: YOUTUBE_CHANNEL_NOT_FOUND_ERROR,
      success: false,
    })
  })

  it('should return error when talent has no linked YouTube channels', async () => {
    answerTalent({ youtube_channels: [] })

    const result = await syncTalentWithYouTube(talentId)

    expect(result).toEqual({
      error: 'このタレントに紐づくYouTubeチャンネルはありません。',
      success: false,
    })
    expect(getChannels).not.toHaveBeenCalled()
  })
})

describe('syncTalentWithTwitch', () => {
  it('should update twitch user name and login from Helix API', async () => {
    answerTalent({ twitch_users: [savedUser()] })
    answerUsers(helixUser('New Name', 'newlogin'))

    const result = await syncTalentWithTwitch(talentId)

    expect(result).toEqual({ success: true })
    expect(getUsers).toHaveBeenCalledWith({ ids: [twitchUserId] })
    const upserts = supabase.calls('upsert', 'twitch_users')
    expect(upserts).toHaveLength(1)
    expect(upserts[0]?.body).toEqual({
      id: twitchUserRowId,
      name: 'New Name',
      talent_id: talentId,
      twitch_login_name: 'newlogin',
      twitch_user_id: twitchUserId,
    })
    expect(upserts[0]?.query['on_conflict']).toBe('id')
    expect(talentUpdates()[0]?.body).toEqual({
      updated_at: '2024-11-24T17:00:00Z',
    })
    test.expectAuditLog('CHANNEL_SYNC', talentId, {
      platform: 'twitch',
      users: [
        {
          after: {
            name: 'New Name',
            twitch_login_name: 'newlogin',
          },
          before: {
            name: 'Old Name',
            twitch_login_name: 'oldlogin',
          },
          twitch_user_id: twitchUserId,
        },
      ],
    })
  })

  it('should return already up to date when user data is unchanged', async () => {
    answerTalent({
      twitch_users: [
        savedUser({ name: 'Same Name', twitch_login_name: 'samelogin' }),
      ],
    })
    answerUsers(helixUser('Same Name', 'samelogin'))

    const result = await syncTalentWithTwitch(talentId)

    expect(result).toEqual({
      message: 'Twitchユーザー情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    expect(supabase.calls('upsert', 'twitch_users')).not.toHaveLength(0)
    expect(talentUpdates()).toHaveLength(0)
    test.expectNoAuditLog()
  })

  it('should select the saved icon of each Twitch user', async () => {
    answerTalent({ twitch_users: [] })

    await syncTalentWithTwitch(talentId)

    expect(talentSelect()).toEqual(
      expect.stringContaining(PROFILE_IMAGES_SELECT),
    )
  })

  it('should record a changed icon even when name and login are unchanged', async () => {
    const user = savedUser({
      name: 'Same Name',
      twitch_login_name: 'samelogin',
    })
    const twitchUser = helixUser(
      'Same Name',
      'samelogin',
      'https://static-cdn.jtvnw.net/jtv_user_pictures/same-profile_image-300x300.png',
    )
    answerTalent({ twitch_users: [user] })
    answerUsers(twitchUser)
    vi.mocked(syncTwitchUserIconSafely).mockResolvedValueOnce('replaced')

    const result = await syncTalentWithTwitch(talentId)

    expect(result).toEqual({ success: true })
    expect(syncTwitchUserIconSafely).toHaveBeenCalledWith(twitchUser, user)
    expect(talentUpdates()).not.toHaveLength(0)
    test.expectAuditLog('CHANNEL_SYNC', talentId, {
      platform: 'twitch',
      users: [
        {
          after: { name: 'Same Name', twitch_login_name: 'samelogin' },
          before: { name: 'Same Name', twitch_login_name: 'samelogin' },
          profile_image: 'replaced',
          twitch_user_id: twitchUserId,
        },
      ],
    })
  })

  it('should still sync name and login when the icon cannot be synced', async () => {
    answerTalent({ twitch_users: [savedUser()] })
    answerUsers(
      helixUser(
        'New Name',
        'newlogin',
        'https://static-cdn.jtvnw.net/jtv_user_pictures/new-profile_image-300x300.png',
      ),
    )
    // 失敗時はヘルパーがログに記録して null を返す
    vi.mocked(syncTwitchUserIconSafely).mockResolvedValueOnce(null)

    const result = await syncTalentWithTwitch(talentId)

    expect(result).toEqual({ success: true })
    expect(supabase.calls('upsert', 'twitch_users')).not.toHaveLength(0)
    test.expectAuditLog('CHANNEL_SYNC', talentId, {
      platform: 'twitch',
      users: [
        {
          after: { name: 'New Name', twitch_login_name: 'newlogin' },
          before: { name: 'Old Name', twitch_login_name: 'oldlogin' },
          twitch_user_id: twitchUserId,
        },
      ],
    })
  })

  it('should still sync the icon when name and login cannot be written', async () => {
    const user = savedUser()
    const twitchUser = helixUser(
      'New Name',
      'newlogin',
      'https://static-cdn.jtvnw.net/jtv_user_pictures/new-profile_image-300x300.png',
    )
    answerTalent({ twitch_users: [user] })
    supabase.on(
      'upsert',
      'twitch_users',
      postgresError('23505', 'duplicate key value'),
    )
    answerUsers(twitchUser)
    vi.mocked(syncTwitchUserIconSafely).mockResolvedValueOnce('created')

    const result = await syncTalentWithTwitch(talentId)

    expect(result).toEqual({ success: true })
    expect(syncTwitchUserIconSafely).toHaveBeenCalledWith(twitchUser, user)
    expect(talentUpdates()).not.toHaveLength(0)
    // name / login は書き込めていないので、監査ログにはアイコンの変更だけを残す
    test.expectAuditLog('CHANNEL_SYNC', talentId, {
      platform: 'twitch',
      users: [{ profile_image: 'created', twitch_user_id: twitchUserId }],
    })
  })

  it.each([
    ['cannot be synced', null],
    ['is unchanged', 'unchanged'],
  ] as const)(
    'should fail when name and login cannot be written and the icon %s',
    async (_, iconResult) => {
      answerTalent({ twitch_users: [savedUser()] })
      supabase.on(
        'upsert',
        'twitch_users',
        postgresError('23505', 'duplicate key value'),
      )
      answerUsers(helixUser('New Name', 'newlogin'))
      vi.mocked(syncTwitchUserIconSafely).mockResolvedValueOnce(iconResult)

      const result = await syncTalentWithTwitch(talentId)

      // アイコンが変わっていなければ、書き込めなかった name / login を「最新」と報告しない
      expect(result).toEqual({
        error: TWITCH_USER_NOT_FOUND_ERROR,
        success: false,
      })
      test.expectNoAuditLog()
    },
  )

  it('should return error when talent has no linked Twitch users', async () => {
    answerTalent({ twitch_users: [] })

    const result = await syncTalentWithTwitch(talentId)

    expect(result).toEqual({
      error: 'このタレントに紐づくTwitchユーザーはありません。',
      success: false,
    })
    expect(getUsers).not.toHaveBeenCalled()
  })
})

describe('syncTalentAccounts', () => {
  it('should include the saved YouTube icon when syncing both platforms', async () => {
    const channel = savedChannel({
      name: 'Same Name',
      profile_images: {
        etag: 'etag',
        id: 'image-id',
        path: 'image-path',
        source_url: 'https://example.com/image',
      },
      youtube_handle: '@same',
    })
    answerTalent({ twitch_users: [savedUser()], youtube_channels: [channel] })
    answerChannels(youtubeChannel({ customUrl: '@same', title: 'Same Name' }))
    answerUsers(helixUser('New Name', 'newlogin'))
    vi.mocked(syncYouTubeChannelIconSafely).mockResolvedValueOnce('replaced')

    const result = await syncTalentAccounts(talentId)

    expect(talentSelect()).toEqual(
      expect.stringContaining(PROFILE_IMAGES_SELECT),
    )
    expect(syncYouTubeChannelIconSafely).toHaveBeenCalledWith(
      expect.objectContaining({ id: youtubeChannelId }),
      channel,
    )
    expect(supabase.calls('upsert', 'twitch_users')).not.toHaveLength(0)
    expect(result).toEqual({
      message:
        'YouTube: チャンネル情報を同期しました。\nTwitch: ユーザー情報を同期しました。',
      success: true,
      unchanged: false,
    })
  })

  it('should sync a talent that only has a Twitch user', async () => {
    answerTalent({ twitch_users: [savedUser()], youtube_channels: [] })
    answerUsers(helixUser('New Name', 'newlogin'))

    const result = await syncTalentAccounts(talentId)

    expect(result).toEqual({
      message: 'Twitch: ユーザー情報を同期しました。',
      success: true,
      unchanged: false,
    })
    expect(getChannels).not.toHaveBeenCalled()
    const upserts = supabase.calls('upsert', 'twitch_users')
    expect(upserts).toContainEqual(
      expect.objectContaining({
        body: expect.objectContaining({
          name: 'New Name',
          twitch_login_name: 'newlogin',
        }),
        query: expect.objectContaining({ on_conflict: 'id' }),
      }),
    )
    test.expectAuditLog(
      'CHANNEL_SYNC',
      talentId,
      expect.objectContaining({ platform: 'twitch' }),
    )
  })

  it('should keep the Twitch result when YouTube fails and report which one failed', async () => {
    answerTalent({
      twitch_users: [savedUser()],
      youtube_channels: [
        savedChannel({ name: 'Channel', youtube_handle: '@channel' }),
      ],
    })
    vi.mocked(getChannels).mockReturnValue(
      // biome-ignore lint/correctness/useYield: throws before yielding
      (async function* (): AsyncGenerator<never> {
        throw new Error('quota exceeded')
      })() as never,
    )
    answerUsers(helixUser('New Name', 'newlogin'))

    const result = await syncTalentAccounts(talentId)

    expect(result).toEqual({
      error:
        'YouTube: 同期に失敗しました。quota exceeded\nTwitch: ユーザー情報を同期しました。',
      success: false,
      unchanged: false,
    })
    expect(supabase.calls('upsert', 'youtube_channels')).toHaveLength(0)
    expect(supabase.calls('upsert', 'twitch_users')).not.toHaveLength(0)
    expect(test.createAuditLog).toHaveBeenCalledTimes(1)
    test.expectAuditLog('CHANNEL_SYNC', talentId, expect.anything())
  })

  it('should report each platform when everything is up to date', async () => {
    answerTalent({
      twitch_users: [
        savedUser({ name: 'Same Name', twitch_login_name: 'samelogin' }),
      ],
      youtube_channels: [
        savedChannel({ name: 'Same Name', youtube_handle: '@same' }),
      ],
    })
    answerChannels(youtubeChannel({ customUrl: '@same', title: 'Same Name' }))
    answerUsers(helixUser('Same Name', 'samelogin'))

    const result = await syncTalentAccounts(talentId)

    expect(result).toEqual({
      message:
        'YouTube: チャンネル情報は既に最新です。\nTwitch: ユーザー情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    test.expectNoAuditLog()
  })

  it('should return error when the talent has no accounts', async () => {
    answerTalent({ twitch_users: [], youtube_channels: [] })

    const result = await syncTalentAccounts(talentId)

    expect(result).toEqual({
      error:
        'このタレントに紐づくYouTubeチャンネル・Twitchユーザーはありません。',
      success: false,
    })
    expect(getChannels).not.toHaveBeenCalled()
    expect(getUsers).not.toHaveBeenCalled()
  })
})
