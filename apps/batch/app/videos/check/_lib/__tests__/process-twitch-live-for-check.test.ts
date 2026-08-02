import { createClient } from '@supabase/supabase-js'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { Temporal } from 'temporal-polyfill'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { SavedTwitchVideo } from '../get-saved-twitch-videos'
import { processTwitchLiveForCheck } from '../process-twitch-live-for-check'

const server = setupServer()

const MOCK_SUPABASE_URL = 'https://fake.supabase.test'
const MOCK_SUPABASE_ANON_KEY = 'mock-anon-key'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

const logger = {
  info: vi.fn(),
}

function makeLiveVideo(options: {
  id: string
  stream_id: string
  title?: string
}): SavedTwitchVideo {
  return {
    duration: 'P0D',
    id: options.id,
    published_at: '2023-01-15T09:00:00Z',
    status: 'LIVE',
    thumbnail: null,
    title: options.title ?? 'Live now',
    twitch_video: {
      helix_user_id: '100001',
      id: `tv-${options.id}`,
      stream_id: options.stream_id,
      twitch_video_id: `live:${options.stream_id}`,
      type: null,
    },
  }
}

describe('processTwitchLiveForCheck', () => {
  it('keeps LIVE and updates title when stream is still live', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    const videoPatches: unknown[] = []

    server.use(
      http.patch('*/rest/v1/videos', async ({ request }) => {
        videoPatches.push(await request.json())
        return HttpResponse.json([{ id: 'video-1' }])
      }),
    )

    const hasChanges = await processTwitchLiveForCheck({
      currentDateTime: Temporal.Instant.from('2023-01-15T10:00:00Z'),
      liveStreams: [
        {
          game_id: '1',
          game_name: 'Game',
          id: 'stream-1',
          is_mature: false,
          language: 'ja',
          started_at: '2023-01-15T09:00:00Z',
          tags: [],
          thumbnail_url: 'https://example.com/{width}x{height}.jpg',
          title: 'Updated live title',
          type: 'live',
          user_id: '100001',
          user_login: 'alice',
          user_name: 'Alice',
          viewer_count: 10,
        },
      ],
      logger,
      savedVideos: [
        makeLiveVideo({
          id: 'video-1',
          stream_id: 'stream-1',
          title: 'Old live title',
        }),
      ],
      supabaseClient,
    })

    expect(hasChanges).toBe(true)
    expect(videoPatches).toHaveLength(1)
    expect(videoPatches[0]).toMatchObject({
      status: 'LIVE',
      title: 'Updated live title',
    })
  })

  it('sets ENDED when stream is offline and no archive yet', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    const videoPatches: unknown[] = []

    server.use(
      http.patch('*/rest/v1/videos', async ({ request }) => {
        videoPatches.push(await request.json())
        return HttpResponse.json([{ id: 'video-1' }])
      }),
    )

    const hasChanges = await processTwitchLiveForCheck({
      currentDateTime: Temporal.Instant.from('2023-01-15T10:00:00Z'),
      liveStreams: [],
      logger,
      savedVideos: [
        makeLiveVideo({
          id: 'video-1',
          stream_id: 'stream-1',
        }),
      ],
      supabaseClient,
    })

    expect(hasChanges).toBe(true)
    expect(videoPatches[0]).toMatchObject({
      status: 'ENDED',
    })
  })

  it('promotes LIVE placeholder to archive when VOD is available', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    const videoPatches: unknown[] = []
    const twitchPatches: unknown[] = []

    server.use(
      http.patch('*/rest/v1/videos', async ({ request }) => {
        videoPatches.push(await request.json())
        return HttpResponse.json([{ id: 'video-1' }])
      }),
      http.patch('*/rest/v1/twitch_videos', async ({ request }) => {
        twitchPatches.push(await request.json())
        return HttpResponse.json([{ id: 'tv-video-1' }])
      }),
    )

    const hasChanges = await processTwitchLiveForCheck({
      archives: [
        {
          created_at: '2023-01-15T09:00:00Z',
          description: '',
          duration: 'PT2H0M0S',
          id: 'vod-999',
          language: 'ja',
          published_at: '2023-01-15T09:00:00Z',
          stream_id: 'stream-1',
          thumbnail_url: 'https://example.com/t.jpg',
          title: 'Archive title',
          type: 'archive',
          url: 'https://www.twitch.tv/videos/vod-999',
          user_id: '100001',
          user_login: 'alice',
          user_name: 'Alice',
          view_count: 1,
          viewable: 'public',
        },
      ],
      currentDateTime: Temporal.Instant.from('2023-01-15T10:00:00Z'),
      liveStreams: [],
      logger,
      savedVideos: [
        makeLiveVideo({
          id: 'video-1',
          stream_id: 'stream-1',
        }),
      ],
      supabaseClient,
    })

    expect(hasChanges).toBe(true)
    expect(videoPatches[0]).toMatchObject({
      duration: 'PT2H0M0S',
      status: 'ENDED',
      title: 'Archive title',
    })
    expect(twitchPatches[0]).toMatchObject({
      stream_id: 'stream-1',
      twitch_video_id: 'vod-999',
      type: 'archive',
    })
  })

  it('returns false when nothing changed', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    const hasChanges = await processTwitchLiveForCheck({
      currentDateTime: Temporal.Instant.from('2023-01-15T10:00:00Z'),
      liveStreams: [
        {
          game_id: '1',
          game_name: 'Game',
          id: 'stream-1',
          is_mature: false,
          language: 'ja',
          started_at: '2023-01-15T09:00:00Z',
          tags: [],
          thumbnail_url: 'https://example.com/{width}x{height}.jpg',
          title: 'Live now',
          type: 'live',
          user_id: '100001',
          user_login: 'alice',
          user_name: 'Alice',
          viewer_count: 10,
        },
      ],
      logger,
      savedVideos: [
        makeLiveVideo({
          id: 'video-1',
          stream_id: 'stream-1',
          title: 'Live now',
        }),
      ],
      supabaseClient,
    })

    expect(hasChanges).toBe(false)
  })
})
