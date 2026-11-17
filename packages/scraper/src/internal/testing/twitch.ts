import type {
  TwitchClip,
  TwitchStream,
  TwitchVideo,
} from '@shinju-date/twitch-api-client'
import type { SavedTwitchVideo } from '../../twitch/saved-video.js'

/** Builds a Helix stream with sensible defaults for tests. */
export function createStream(
  overrides: Partial<TwitchStream> = {},
): TwitchStream {
  return {
    game_id: '1',
    game_name: 'Game',
    id: 'stream-1',
    is_mature: false,
    language: 'ja',
    started_at: '2024-05-01T09:00:00Z',
    tags: [],
    thumbnail_url: 'https://cdn.test/live-{width}x{height}.jpg',
    title: 'Live now',
    type: 'live',
    user_id: 'twitch-user-1',
    user_login: 'alice',
    user_name: 'Alice',
    viewer_count: 10,
    ...overrides,
  }
}

/** Builds a Helix video (an archive by default) for tests. */
export function createVideo(overrides: Partial<TwitchVideo> = {}): TwitchVideo {
  return {
    created_at: '2024-05-01T09:00:00Z',
    description: '',
    duration: 'PT2H',
    id: 'vod-1',
    language: 'ja',
    published_at: '2024-05-01T09:00:00Z',
    stream_id: 'stream-1',
    thumbnail_url: 'https://cdn.test/vod-%{width}x%{height}.jpg',
    title: 'Archive',
    type: 'archive',
    url: 'https://www.twitch.tv/videos/vod-1',
    user_id: 'twitch-user-1',
    user_login: 'alice',
    user_name: 'Alice',
    view_count: 1,
    viewable: 'public',
    ...overrides,
  }
}

/** Builds a Helix clip for tests. */
export function createClip(overrides: Partial<TwitchClip> = {}): TwitchClip {
  return {
    broadcaster_id: 'twitch-user-1',
    broadcaster_name: 'Alice',
    created_at: '2024-05-01T09:00:00Z',
    creator_id: 'twitch-user-2',
    creator_name: 'Bob',
    duration: 'PT30S',
    embed_url: '',
    game_id: '1',
    id: 'clip-1',
    language: 'ja',
    thumbnail_url: 'https://cdn.test/clip.jpg',
    title: 'Clip',
    url: 'https://clips.twitch.tv/clip-1',
    video_id: 'vod-1',
    view_count: 1,
    vod_offset: 0,
    ...overrides,
  }
}

interface SavedVideoOverrides
  extends Partial<Omit<SavedTwitchVideo, 'twitch_video'>> {
  twitch_video?: Partial<SavedTwitchVideo['twitch_video']>
}

/**
 * Builds a saved row. Defaults to the placeholder of a broadcast that is on
 * air: LIVE, no archive known yet.
 */
export function createSavedVideo({
  twitch_video: twitchVideo,
  ...overrides
}: SavedVideoOverrides = {}): SavedTwitchVideo {
  return {
    deleted_at: null,
    duration: 'P0D',
    id: 'video-1',
    published_at: '2024-05-01T09:00:00+00:00',
    status: 'LIVE',
    thumbnail_id: 'thumb-live',
    title: 'Live now',
    ...overrides,
    twitch_video: {
      id: 'twitch-row-1',
      stream_id: 'stream-1',
      twitch_video_id: 'live:stream-1',
      type: null,
      ...twitchVideo,
    },
  }
}
