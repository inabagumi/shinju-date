import { describe, expect, test } from 'vitest'
import {
  getVideoUrl,
  hasPlatformSource,
  type VideoUrlSource,
} from './video-url'

function createYouTubeVideo(
  overrides: Partial<VideoUrlSource> = {},
): VideoUrlSource {
  return {
    platform: 'youtube',
    status: 'ENDED',
    twitch_video: null,
    youtube_video: { youtube_video_id: 'YT_video1abc' },
    ...overrides,
  }
}

function createTwitchVideo(
  twitchVideo: Partial<NonNullable<VideoUrlSource['twitch_video']>> = {},
  overrides: Partial<VideoUrlSource> = {},
): VideoUrlSource {
  return {
    platform: 'twitch',
    status: 'ENDED',
    twitch_video: {
      twitch_user: { twitch_login_name: 'mio' },
      twitch_video_id: '1234567890',
      type: 'archive',
      ...twitchVideo,
    },
    youtube_video: null,
    ...overrides,
  }
}

describe('getVideoUrl', () => {
  test('links a YouTube video to its watch page', () => {
    expect(getVideoUrl(createYouTubeVideo())).toBe(
      'https://www.youtube.com/watch?v=YT_video1abc',
    )
  })

  test('links a live YouTube video to its watch page', () => {
    expect(getVideoUrl(createYouTubeVideo({ status: 'LIVE' }))).toBe(
      'https://www.youtube.com/watch?v=YT_video1abc',
    )
  })

  test.each(['LIVE', 'UPCOMING'] as const)(
    'links a %s Twitch stream to the channel',
    (status) => {
      expect(getVideoUrl(createTwitchVideo({}, { status }))).toBe(
        'https://www.twitch.tv/mio',
      )
    },
  )

  test('links a Twitch archive to the video', () => {
    expect(getVideoUrl(createTwitchVideo())).toBe(
      'https://www.twitch.tv/videos/1234567890',
    )
  })

  test('links a pending Twitch archive to the channel', () => {
    expect(
      getVideoUrl(
        createTwitchVideo({ twitch_video_id: 'live:12345678901', type: null }),
      ),
    ).toBe('https://www.twitch.tv/mio')
  })

  test('links a Twitch clip to the clip', () => {
    expect(
      getVideoUrl(
        createTwitchVideo({ twitch_video_id: 'FunnyClipSlug', type: 'clip' }),
      ),
    ).toBe('https://clips.twitch.tv/FunnyClipSlug')
  })

  test('returns null for a YouTube video without the YouTube video', () => {
    expect(getVideoUrl(createYouTubeVideo({ youtube_video: null }))).toBeNull()
  })

  test('returns null for a Twitch video without the Twitch video', () => {
    expect(
      getVideoUrl(
        createTwitchVideo(
          {},
          { twitch_video: null, youtube_video: { youtube_video_id: 'abc' } },
        ),
      ),
    ).toBeNull()
  })

  test('returns null for a pending Twitch archive without the login', () => {
    expect(
      getVideoUrl(
        createTwitchVideo({
          twitch_user: { twitch_login_name: null },
          twitch_video_id: 'live:12345678901',
          type: null,
        }),
      ),
    ).toBeNull()
  })
})

describe('hasPlatformSource', () => {
  test('is true for a video that can be linked to', () => {
    expect(hasPlatformSource(createYouTubeVideo())).toBe(true)
    expect(hasPlatformSource(createTwitchVideo())).toBe(true)
  })

  test('is false for a video that cannot be linked to', () => {
    expect(hasPlatformSource(createYouTubeVideo({ youtube_video: null }))).toBe(
      false,
    )
    expect(
      hasPlatformSource(
        createTwitchVideo({
          twitch_user: { twitch_login_name: null },
          twitch_video_id: 'live:12345678901',
          type: null,
        }),
      ),
    ).toBe(false)
  })
})
