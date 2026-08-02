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
import { processTwitchVideosForCheck } from '../process-twitch-videos-for-check'

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

function makeSavedVideo(options: {
  duration?: string
  id: string
  published_at?: string
  status?: SavedTwitchVideo['status']
  stream_id?: string | null
  thumbnail?: SavedTwitchVideo['thumbnail']
  title?: string
  twitch_video_id: string
  type?: SavedTwitchVideo['twitch_video']['type']
}): SavedTwitchVideo {
  return {
    duration: options.duration ?? 'PT1H0M0S',
    id: options.id,
    published_at: options.published_at ?? '2023-01-10T12:00:00Z',
    status: options.status ?? 'ENDED',
    thumbnail: options.thumbnail ?? null,
    title: options.title ?? 'Old title',
    twitch_video: {
      id: `tv-${options.id}`,
      stream_id: options.stream_id ?? null,
      twitch_video_id: options.twitch_video_id,
      type: options.type ?? 'archive',
    },
  }
}

describe('processTwitchVideosForCheck', () => {
  it('updates metadata when Helix data differs', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    const updates: Array<{ id: string; body: unknown }> = []

    server.use(
      http.patch('*/rest/v1/videos', async ({ request }) => {
        const url = new URL(request.url)
        const idFilter = url.searchParams.get('id')
        const body = await request.json()
        updates.push({ body, id: idFilter ?? '' })
        return HttpResponse.json([{ id: 'video-1' }])
      }),
    )

    const savedVideos = [
      makeSavedVideo({
        id: 'video-1',
        title: 'Old title',
        twitch_video_id: 'tw-1',
      }),
    ]

    const hasChanges = await processTwitchVideosForCheck({
      clips: [],
      currentDateTime: Temporal.Instant.from('2023-01-15T10:00:00Z'),
      logger,
      mode: 'recent',
      savedVideos,
      supabaseClient,
      videos: [
        {
          created_at: '2023-01-10T12:00:00Z',
          description: '',
          duration: 'PT2H0M0S',
          id: 'tw-1',
          language: 'ja',
          published_at: '2023-01-10T12:00:00Z',
          stream_id: null,
          thumbnail_url: 'https://example.com/t.jpg',
          title: 'New title',
          type: 'archive',
          url: 'https://www.twitch.tv/videos/tw-1',
          user_id: '100001',
          user_login: 'alice',
          user_name: 'Alice',
          view_count: 10,
          viewable: 'public',
        },
      ],
    })

    expect(hasChanges).toBe(true)
    expect(updates.length).toBeGreaterThan(0)
  })

  it('soft-deletes videos missing from Helix response', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    const deletedIds: string[] = []

    server.use(
      http.patch('*/rest/v1/videos', async ({ request }) => {
        const body = (await request.json()) as { deleted_at?: string }
        if (body.deleted_at) {
          const url = new URL(request.url)
          deletedIds.push(url.searchParams.get('id') ?? '')
          return HttpResponse.json([{ id: 'video-missing' }])
        }
        return HttpResponse.json([])
      }),
    )

    const savedVideos = [
      makeSavedVideo({
        id: 'video-missing',
        twitch_video_id: 'tw-missing',
      }),
      makeSavedVideo({
        id: 'video-ok',
        title: 'Still here',
        twitch_video_id: 'tw-ok',
      }),
    ]

    const hasChanges = await processTwitchVideosForCheck({
      clips: [],
      currentDateTime: Temporal.Instant.from('2023-01-15T10:00:00Z'),
      logger,
      mode: 'all',
      savedVideos,
      supabaseClient,
      videos: [
        {
          created_at: '2023-01-10T12:00:00Z',
          description: '',
          duration: 'PT1H0M0S',
          id: 'tw-ok',
          language: 'ja',
          published_at: '2023-01-10T12:00:00Z',
          stream_id: null,
          thumbnail_url: 'https://example.com/t.jpg',
          title: 'Still here',
          type: 'archive',
          url: 'https://www.twitch.tv/videos/tw-ok',
          user_id: '100001',
          user_login: 'alice',
          user_name: 'Alice',
          view_count: 1,
          viewable: 'public',
        },
      ],
    })

    expect(hasChanges).toBe(true)
    expect(deletedIds.some((id) => id.includes('video-missing'))).toBe(true)
  })

  it('returns false when nothing changed', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    const savedVideos = [
      makeSavedVideo({
        duration: 'PT1H0M0S',
        id: 'video-1',
        published_at: '2023-01-10T12:00:00Z',
        title: 'Same title',
        twitch_video_id: 'tw-1',
      }),
    ]

    const hasChanges = await processTwitchVideosForCheck({
      clips: [],
      currentDateTime: Temporal.Instant.from('2023-01-15T10:00:00Z'),
      logger,
      mode: 'recent',
      savedVideos,
      supabaseClient,
      videos: [
        {
          created_at: '2023-01-10T12:00:00Z',
          description: '',
          duration: 'PT1H0M0S',
          id: 'tw-1',
          language: 'ja',
          published_at: '2023-01-10T12:00:00Z',
          stream_id: null,
          thumbnail_url: 'https://example.com/t.jpg',
          title: 'Same title',
          type: 'archive',
          url: 'https://www.twitch.tv/videos/tw-1',
          user_id: '100001',
          user_login: 'alice',
          user_name: 'Alice',
          view_count: 1,
          viewable: 'public',
        },
      ],
    })

    expect(hasChanges).toBe(false)
  })

  it('updates clip metadata from Helix clip payload', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    const updates: Array<{ id: string; body: unknown }> = []

    server.use(
      http.patch('*/rest/v1/videos', async ({ request }) => {
        const url = new URL(request.url)
        const idFilter = url.searchParams.get('id')
        const body = await request.json()
        updates.push({ body, id: idFilter ?? '' })
        return HttpResponse.json([{ id: 'clip-video-1' }])
      }),
    )

    const savedVideos = [
      makeSavedVideo({
        id: 'clip-video-1',
        status: 'ENDED',
        title: 'Old clip title',
        twitch_video_id: 'clip-slug-1',
        type: 'clip',
      }),
    ]

    const hasChanges = await processTwitchVideosForCheck({
      clips: [
        {
          broadcaster_id: '100001',
          broadcaster_name: 'Alice',
          created_at: '2023-01-10T12:00:00Z',
          creator_id: '100002',
          creator_name: 'Bob',
          duration: 'PT0M45S',
          embed_url: '',
          game_id: '1',
          id: 'clip-slug-1',
          language: 'ja',
          thumbnail_url: 'https://example.com/c.jpg',
          title: 'New clip title',
          url: 'https://clips.twitch.tv/clip-slug-1',
          video_id: 'v1',
          view_count: 10,
          vod_offset: 0,
        },
      ],
      currentDateTime: Temporal.Instant.from('2023-01-15T10:00:00Z'),
      logger,
      mode: 'recent',
      savedVideos,
      supabaseClient,
      videos: [],
    })

    expect(hasChanges).toBe(true)
    expect(updates.length).toBeGreaterThan(0)
  })

  it('soft-deletes clips missing from Helix response', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    const deletedBodies: unknown[] = []

    server.use(
      http.patch('*/rest/v1/videos', async ({ request }) => {
        const body = await request.json()
        deletedBodies.push(body)
        return HttpResponse.json([{ id: 'clip-missing' }])
      }),
    )

    const hasChanges = await processTwitchVideosForCheck({
      clips: [],
      currentDateTime: Temporal.Instant.from('2023-01-15T10:00:00Z'),
      logger,
      mode: 'recent',
      savedVideos: [
        makeSavedVideo({
          id: 'clip-missing',
          twitch_video_id: 'clip-gone',
          type: 'clip',
        }),
      ],
      supabaseClient,
      videos: [],
    })

    expect(hasChanges).toBe(true)
    expect(deletedBodies.length).toBeGreaterThan(0)
  })
})
