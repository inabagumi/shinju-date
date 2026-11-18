import { describe, expect, it } from 'vitest'
import { DatabaseError } from '../errors.js'
import { postgresError, setupSupabase } from '../testing/supabase.js'
import {
  findSavedYouTubeVideoIds,
  insertVideo,
  softDeleteUnavailableVideos,
} from './videos.js'

const supabase = setupSupabase()

const video = {
  duration: 'PT10M',
  platform: 'youtube' as const,
  published_at: '2024-01-01T00:00:00Z',
  status: 'PUBLISHED' as const,
  talent_id: 'talent-1',
  title: 'Video',
}
const youtubeVideo = {
  platform: 'youtube' as const,
  values: { youtube_channel_id: 'channel-row-1', youtube_video_id: 'yt-1' },
}

describe('insertVideo', () => {
  it('inserts the video and its platform row under one ID', async () => {
    supabase.respond(() => [])

    const videoId = await insertVideo(
      supabase.supabaseClient,
      video,
      youtubeVideo,
    )

    expect(videoId).toEqual(expect.any(String))
    expect(supabase.requests.map((r) => `${r.method} ${r.table}`)).toEqual([
      'POST videos',
      'POST youtube_videos',
    ])
    expect(supabase.requests[0]?.body).toEqual({ ...video, id: videoId })
    expect(supabase.requests[1]?.body).toEqual({
      video_id: videoId,
      youtube_channel_id: 'channel-row-1',
      youtube_video_id: 'yt-1',
    })
  })

  it('inserts Twitch videos into twitch_videos', async () => {
    supabase.respond(() => [])

    const videoId = await insertVideo(
      supabase.supabaseClient,
      { ...video, platform: 'twitch' },
      {
        platform: 'twitch',
        values: {
          stream_id: 'stream-1',
          twitch_user_id: 'user-row-1',
          twitch_video_id: 'live:stream-1',
          type: null,
        },
      },
    )

    expect(supabase.written('POST', 'twitch_videos')[0]?.body).toEqual({
      stream_id: 'stream-1',
      twitch_user_id: 'user-row-1',
      twitch_video_id: 'live:stream-1',
      type: null,
      video_id: videoId,
    })
  })

  it('removes the video again when its platform row cannot be inserted', async () => {
    supabase.respond(({ method, table }) =>
      method === 'POST' && table === 'youtube_videos'
        ? postgresError('23503', 'violates foreign key constraint')
        : [],
    )

    await expect(
      insertVideo(supabase.supabaseClient, video, youtubeVideo),
    ).rejects.toThrow('violates foreign key constraint')

    const inserted = supabase.written('POST', 'videos')[0]?.body as {
      id: string
    }

    expect(supabase.written('DELETE', 'videos')[0]?.query['id']).toBe(
      `eq.${inserted.id}`,
    )
  })

  it('returns null when another run already saved the platform video', async () => {
    supabase.respond(({ method, table }) =>
      method === 'POST' && table === 'youtube_videos'
        ? postgresError('23505', 'duplicate key value')
        : [],
    )

    await expect(
      insertVideo(supabase.supabaseClient, video, youtubeVideo),
    ).resolves.toBeNull()
    expect(supabase.written('DELETE', 'videos')).toHaveLength(1)
  })

  it('does not touch the platform table when the video cannot be inserted', async () => {
    supabase.respond(() => postgresError('23502', 'null value in column'))

    await expect(
      insertVideo(supabase.supabaseClient, video, youtubeVideo),
    ).rejects.toThrow('null value in column')
    expect(supabase.requests).toHaveLength(1)
  })
})

describe('softDeleteUnavailableVideos', () => {
  const now = Temporal.Instant.from('2024-05-01T12:34:56.789Z')

  it('soft-deletes the videos as unavailable with one function call', async () => {
    supabase.respond(() => ['video-1', 'video-2'])

    const deletedCount = await softDeleteUnavailableVideos(
      supabase.supabaseClient,
      { now, videoIds: ['video-1', 'video-2'] },
    )

    expect(deletedCount).toBe(2)
    expect(supabase.requests.map((r) => `${r.method} ${r.table}`)).toEqual([
      'POST rpc/soft_delete_videos',
    ])
    expect(supabase.requests[0]?.body).toEqual({
      p_deleted_at: '2024-05-01T12:34:56Z',
      p_reason: 'unavailable',
      p_video_ids: ['video-1', 'video-2'],
    })
  })

  it('counts only the videos the function deleted', async () => {
    // The function leaves the videos deleted meanwhile untouched.
    supabase.respond(() => ['video-2'])

    const deletedCount = await softDeleteUnavailableVideos(
      supabase.supabaseClient,
      { now, videoIds: ['video-1', 'video-2'] },
    )

    expect(deletedCount).toBe(1)
  })

  it('splits long ID lists into calls of 1,000 videos', async () => {
    supabase.respond(() => [])

    await softDeleteUnavailableVideos(supabase.supabaseClient, {
      now,
      videoIds: Array.from({ length: 2500 }, (_, i) => `video-${i}`),
    })

    expect(
      supabase
        .written('POST', 'rpc/soft_delete_videos')
        .map(
          ({ body }) => (body as { p_video_ids: string[] }).p_video_ids.length,
        ),
    ).toEqual([1000, 1000, 500])
  })

  it('throws a DatabaseError when the function fails', async () => {
    supabase.respond(() => postgresError('XX000', 'Database error'))

    await expect(
      softDeleteUnavailableVideos(supabase.supabaseClient, {
        now,
        videoIds: ['video-1'],
      }),
    ).rejects.toThrow(DatabaseError)
  })

  it('does nothing without IDs', async () => {
    supabase.respond(() => [])

    await softDeleteUnavailableVideos(supabase.supabaseClient, {
      now,
      videoIds: [],
    })

    expect(supabase.requests).toHaveLength(0)
  })
})

describe('findSavedYouTubeVideoIds', () => {
  it('returns the IDs that are saved', async () => {
    supabase.respond(() => [{ youtube_video_id: 'yt-1' }])

    const savedIds = await findSavedYouTubeVideoIds(supabase.supabaseClient, [
      'yt-1',
      'yt-2',
    ])

    expect([...savedIds]).toEqual(['yt-1'])
    expect(supabase.requests[0]?.query['youtube_video_id']).toBe(
      'in.(yt-1,yt-2)',
    )
  })
})
