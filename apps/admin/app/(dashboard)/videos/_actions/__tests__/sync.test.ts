import { describe, expect, it, vi } from 'vitest'
import { setupActionTest } from '@/test/action-harness'
import { syncVideoWithTwitch } from '../sync'

const test = setupActionTest()
const { supabase } = test

vi.spyOn(Temporal.Now, 'instant').mockReturnValue(
  Temporal.Instant.from('2024-11-24T17:00:00Z'),
)

vi.mock('@shinju-date/youtube-api-client', () => ({
  getPublishedAt: vi.fn(),
  getVideoStatus: vi.fn(),
  getVideos: vi.fn(),
}))

vi.mock('@shinju-date/twitch-api-client', async (importOriginal) => ({
  // Keep the pure helpers (ID and status rules) real; mock Helix calls only.
  ...(await importOriginal<typeof import('@shinju-date/twitch-api-client')>()),
  getArchiveOfStream: vi.fn(),
  getClips: vi.fn(),
  getLiveStream: vi.fn(),
  getVideos: vi.fn(),
}))

const videoId = '30000000-0000-0000-0000-000000000101'
const twitchVideoRowId = '14000000-0000-0000-0000-000000000101'
const twitchVideoId = '1234567890'

describe('syncVideoWithTwitch', () => {
  it('should update archive video metadata from Helix Videos API', async () => {
    const { getVideos } = await import('@shinju-date/twitch-api-client')

    supabase.on('select', 'videos', {
      duration: 'PT3H',
      id: videoId,
      platform: 'twitch',
      published_at: '2024-01-01T00:00:00Z',
      status: 'ENDED',
      title: 'Old Title',
      twitch_video: {
        id: twitchVideoRowId,
        twitch_video_id: twitchVideoId,
        type: 'archive',
      },
      visible: true,
    })

    async function* mockGetVideos() {
      yield {
        created_at: '2024-06-01T12:00:00Z',
        description: '',
        duration: 'PT1H',
        id: twitchVideoId,
        language: 'ja',
        published_at: '2024-06-01T12:00:00Z',
        stream_id: null,
        thumbnail_url: '',
        title: 'New Archive Title',
        type: 'archive' as const,
        url: `https://www.twitch.tv/videos/${twitchVideoId}`,
        user_id: '100001',
        user_login: 'alice',
        user_name: 'Alice',
        view_count: 10,
        viewable: 'public',
      }
    }

    vi.mocked(getVideos).mockReturnValue(mockGetVideos() as never)

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({ success: true })
    expect(getVideos).toHaveBeenCalledWith({ ids: [twitchVideoId] })
    expect(supabase.calls('update', 'videos')).toEqual([
      expect.objectContaining({
        body: expect.objectContaining({
          duration: 'PT1H',
          title: 'New Archive Title',
        }),
      }),
    ])
    test.expectAuditLog(
      'VIDEO_SYNC',
      'videos',
      videoId,
      expect.objectContaining({
        platform: 'twitch',
      }),
    )
  })

  it('should sync clip metadata from Helix Clips API', async () => {
    const { getClips, getVideos } = await import(
      '@shinju-date/twitch-api-client'
    )

    const clipId = 'AwkwardHelplessSalamanderSwiftRage'

    supabase.on('select', 'videos', {
      duration: 'PT30S',
      id: videoId,
      platform: 'twitch',
      published_at: '2024-01-01T00:00:00Z',
      status: 'PUBLISHED',
      title: 'Old Clip',
      twitch_video: {
        id: twitchVideoRowId,
        twitch_video_id: clipId,
        type: 'clip',
      },
      visible: true,
    })

    async function* mockGetClips() {
      yield {
        broadcaster_id: '100001',
        broadcaster_name: 'Alice',
        created_at: '2024-07-01T08:00:00Z',
        creator_id: '100002',
        creator_name: 'Bob',
        duration: 'PT25S',
        embed_url: '',
        game_id: '1',
        id: clipId,
        language: 'ja',
        thumbnail_url: '',
        title: 'New Clip Title',
        url: `https://clips.twitch.tv/${clipId}`,
        video_id: '999',
        view_count: 5,
        vod_offset: null,
      }
    }

    vi.mocked(getClips).mockReturnValue(mockGetClips() as never)

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({ success: true })
    expect(getClips).toHaveBeenCalledWith({ ids: [clipId] })
    expect(getVideos).not.toHaveBeenCalled()
    expect(supabase.calls('update', 'videos')).toEqual([
      expect.objectContaining({
        body: expect.objectContaining({
          duration: 'PT25S',
          title: 'New Clip Title',
        }),
      }),
    ])
  })

  it('should return already up to date when nothing changed', async () => {
    const { getVideos } = await import('@shinju-date/twitch-api-client')

    supabase.on('select', 'videos', {
      duration: 'PT1H',
      id: videoId,
      platform: 'twitch',
      published_at: '2024-06-01T12:00:00Z',
      status: 'ENDED',
      title: 'Same Title',
      twitch_video: {
        id: twitchVideoRowId,
        twitch_video_id: twitchVideoId,
        type: 'archive',
      },
      visible: true,
    })

    async function* mockGetVideos() {
      yield {
        created_at: '2024-06-01T12:00:00Z',
        description: '',
        duration: 'PT1H',
        id: twitchVideoId,
        language: 'ja',
        published_at: '2024-06-01T12:00:00Z',
        stream_id: null,
        thumbnail_url: '',
        title: 'Same Title',
        type: 'archive' as const,
        url: `https://www.twitch.tv/videos/${twitchVideoId}`,
        user_id: '100001',
        user_login: 'alice',
        user_name: 'Alice',
        view_count: 10,
        viewable: 'public',
      }
    }

    vi.mocked(getVideos).mockReturnValue(mockGetVideos() as never)

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({
      message: '動画情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    test.expectNoAuditLog()
  })

  it('should return error when the video row is not found', async () => {
    // An unanswered `single()` select gets no rows.
    supabase.on('select', 'videos', [])

    const result = await syncVideoWithTwitch(videoId)

    expect(result.success).toBe(false)
  })
})

const streamId = '316000000001'
const twitchUserId = '100001'
const placeholderId = `live:${streamId}`

interface SavedTwitchVideoRow {
  duration: string
  published_at: string
  status: 'ENDED' | 'LIVE' | 'PUBLISHED'
  title: string
  twitch_video: {
    stream_id: string | null
    twitch_video_id: string
    type: 'archive' | 'clip' | 'highlight' | 'upload' | null
  }
}

function answerSavedTwitchVideo(row: SavedTwitchVideoRow): void {
  supabase.on('select', 'videos', {
    ...row,
    id: videoId,
    platform: 'twitch',
    twitch_video: {
      ...row.twitch_video,
      id: twitchVideoRowId,
      twitch_user: { twitch_user_id: twitchUserId },
    },
    visible: true,
  })
}

function liveStream(title: string) {
  return {
    game_id: '1',
    game_name: 'Just Chatting',
    id: streamId,
    is_mature: false,
    language: 'ja',
    started_at: '2024-06-01T12:00:00Z',
    tags: [],
    thumbnail_url: '',
    title,
    type: 'live' as const,
    user_id: twitchUserId,
    user_login: 'alice',
    user_name: 'Alice',
    viewer_count: 100,
  }
}

function archive(id: string, title: string) {
  return {
    created_at: '2024-06-01T12:00:00Z',
    description: '',
    duration: 'PT2H',
    id,
    language: 'ja',
    published_at: '2024-06-01T12:00:05Z',
    stream_id: streamId,
    thumbnail_url: '',
    title,
    type: 'archive' as const,
    url: `https://www.twitch.tv/videos/${id}`,
    user_id: twitchUserId,
    user_login: 'alice',
    user_name: 'Alice',
    view_count: 10,
    viewable: 'public',
  }
}

describe('syncVideoWithTwitch for broadcasts', () => {
  it('keeps an on-air placeholder LIVE and follows the stream title', async () => {
    const { getArchiveOfStream, getLiveStream, getVideos } = await import(
      '@shinju-date/twitch-api-client'
    )

    answerSavedTwitchVideo({
      duration: 'P0D',
      published_at: '2024-06-01T12:00:00Z',
      status: 'LIVE',
      title: 'Old Stream Title',
      twitch_video: {
        stream_id: streamId,
        twitch_video_id: placeholderId,
        type: null,
      },
    })

    vi.mocked(getLiveStream).mockResolvedValue(liveStream('New Stream Title'))

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({
      message: '配信中の状態を同期しました。',
      success: true,
    })
    expect(getLiveStream).toHaveBeenCalledWith({
      streamId,
      userId: twitchUserId,
    })
    expect(getArchiveOfStream).not.toHaveBeenCalled()
    // The placeholder is not a Helix video ID and must not be looked up.
    expect(getVideos).not.toHaveBeenCalled()
    expect(
      supabase.calls('update', 'videos').map((request) => request.body),
    ).toEqual([
      {
        title: 'New Stream Title',
        updated_at: '2024-11-24T17:00:00Z',
      },
    ])
    expect(supabase.calls('update', 'twitch_videos')).toHaveLength(0)
    test.expectAuditLog('VIDEO_SYNC', 'videos', videoId, {
      after: { title: 'New Stream Title' },
      before: { title: 'Old Stream Title' },
      platform: 'twitch',
    })
  })

  it('does not end a broadcast whose archive was linked while on air', async () => {
    const { getLiveStream, getVideos } = await import(
      '@shinju-date/twitch-api-client'
    )

    answerSavedTwitchVideo({
      duration: 'P0D',
      published_at: '2024-06-01T12:00:00Z',
      status: 'LIVE',
      title: 'Stream Title',
      twitch_video: {
        stream_id: streamId,
        twitch_video_id: '900',
        type: 'archive',
      },
    })

    vi.mocked(getLiveStream).mockResolvedValue(liveStream('Stream Title'))

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({
      message: '動画情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    expect(getVideos).not.toHaveBeenCalled()
    expect(supabase.calls('update', 'videos')).toHaveLength(0)
    test.expectNoAuditLog()
  })

  it('ends an offline placeholder and takes over its archive', async () => {
    const { getArchiveOfStream, getLiveStream } = await import(
      '@shinju-date/twitch-api-client'
    )

    answerSavedTwitchVideo({
      duration: 'P0D',
      published_at: '2024-06-01T12:00:00Z',
      status: 'LIVE',
      title: 'Stream Title',
      twitch_video: {
        stream_id: streamId,
        twitch_video_id: placeholderId,
        type: null,
      },
    })

    vi.mocked(getLiveStream).mockResolvedValue(null)
    vi.mocked(getArchiveOfStream).mockResolvedValue(
      archive('901', 'Archive Title'),
    )

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({ success: true })
    expect(getArchiveOfStream).toHaveBeenCalledWith({
      streamId,
      userId: twitchUserId,
    })
    expect(supabase.calls('update', 'twitch_videos')).toEqual([
      expect.objectContaining({
        body: {
          twitch_video_id: '901',
          type: 'archive',
        },
        query: expect.objectContaining({ id: `eq.${twitchVideoRowId}` }),
      }),
    ])
    expect(
      supabase.calls('update', 'videos').map((request) => request.body),
    ).toEqual([
      {
        duration: 'PT2H',
        published_at: '2024-06-01T12:00:05Z',
        status: 'ENDED',
        title: 'Archive Title',
        updated_at: '2024-11-24T17:00:00Z',
      },
    ])
    test.expectAuditLog(
      'VIDEO_SYNC',
      'videos',
      videoId,
      expect.objectContaining({
        after: expect.objectContaining({ status: 'ENDED' }),
        before: expect.objectContaining({ status: 'LIVE' }),
        twitch_type: { after: 'archive', before: null },
        twitch_video_id: { after: '901', before: placeholderId },
      }),
    )
  })

  it('only ends an offline placeholder whose broadcast has no archive', async () => {
    const { getArchiveOfStream, getLiveStream } = await import(
      '@shinju-date/twitch-api-client'
    )

    answerSavedTwitchVideo({
      duration: 'P0D',
      published_at: '2024-06-01T12:00:00Z',
      status: 'LIVE',
      title: 'Stream Title',
      twitch_video: {
        stream_id: streamId,
        twitch_video_id: placeholderId,
        type: null,
      },
    })

    vi.mocked(getLiveStream).mockResolvedValue(null)
    vi.mocked(getArchiveOfStream).mockResolvedValue(null)

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({
      message:
        '配信は終了しています。アーカイブが見つからないため、配信の終了のみ反映しました。',
      success: true,
    })
    expect(supabase.calls('update', 'twitch_videos')).toHaveLength(0)
    expect(
      supabase.calls('update', 'videos').map((request) => request.body),
    ).toEqual([
      {
        status: 'ENDED',
        updated_at: '2024-11-24T17:00:00Z',
      },
    ])
    test.expectAuditLog('VIDEO_SYNC', 'videos', videoId, {
      after: { status: 'ENDED' },
      before: { status: 'LIVE' },
      platform: 'twitch',
    })
  })

  it('treats an ended placeholder without an archive as up to date', async () => {
    const { getArchiveOfStream, getLiveStream } = await import(
      '@shinju-date/twitch-api-client'
    )

    answerSavedTwitchVideo({
      duration: 'P0D',
      published_at: '2024-06-01T12:00:00Z',
      status: 'ENDED',
      title: 'Stream Title',
      twitch_video: {
        stream_id: streamId,
        twitch_video_id: placeholderId,
        type: null,
      },
    })

    vi.mocked(getLiveStream).mockResolvedValue(null)
    vi.mocked(getArchiveOfStream).mockResolvedValue(null)

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({
      message: '動画情報は既に最新です。',
      success: true,
      unchanged: true,
    })
    expect(supabase.calls('update', 'videos')).toHaveLength(0)
  })

  it('ends a linked archive once its broadcast went offline', async () => {
    const { getArchiveOfStream, getLiveStream, getVideos } = await import(
      '@shinju-date/twitch-api-client'
    )

    answerSavedTwitchVideo({
      duration: 'P0D',
      published_at: '2024-06-01T12:00:00Z',
      status: 'LIVE',
      title: 'Stream Title',
      twitch_video: {
        stream_id: streamId,
        twitch_video_id: '900',
        type: 'archive',
      },
    })

    vi.mocked(getLiveStream).mockResolvedValue(null)

    async function* mockGetVideos() {
      yield archive('900', 'Archive Title')
    }

    vi.mocked(getVideos).mockReturnValue(mockGetVideos() as never)

    const result = await syncVideoWithTwitch(videoId)

    expect(result).toEqual({ success: true })
    expect(getArchiveOfStream).not.toHaveBeenCalled()
    expect(getVideos).toHaveBeenCalledWith({ ids: ['900'] })
    expect(supabase.calls('update', 'twitch_videos')).toHaveLength(0)
    expect(supabase.calls('update', 'videos')).toEqual([
      expect.objectContaining({
        body: expect.objectContaining({
          duration: 'PT2H',
          status: 'ENDED',
          title: 'Archive Title',
        }),
      }),
    ])
  })
})
