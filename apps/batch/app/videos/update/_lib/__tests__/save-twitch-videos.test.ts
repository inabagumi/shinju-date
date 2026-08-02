import { createClient } from '@supabase/supabase-js'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { Temporal } from 'temporal-polyfill'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getTwitchVideoStatus, saveTwitchVideos } from '../save-twitch-videos'

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

describe('getTwitchVideoStatus', () => {
  it('maps archive and highlight to ENDED', () => {
    expect(getTwitchVideoStatus('archive')).toBe('ENDED')
    expect(getTwitchVideoStatus('highlight')).toBe('ENDED')
  })

  it('maps upload to PUBLISHED', () => {
    expect(getTwitchVideoStatus('upload')).toBe('PUBLISHED')
  })
})

describe('saveTwitchVideos', () => {
  it('should only save new videos and skip existing ones', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    server.use(
      http.get('*/rest/v1/twitch_videos', () => {
        return HttpResponse.json([
          {
            twitch_video_id: 'existing-twitch-1',
            type: 'archive',
            video: {
              created_at: '2023-01-05T00:00:00Z',
              deleted_at: null,
              duration: 'PT1H0M0S',
              id: 'saved-uuid-1',
              platform: 'twitch',
              published_at: '2023-01-05T12:00:00Z',
              status: 'ENDED',
              talent_id: 'talent-123',
              thumbnail_id: null,
              title: 'Existing Twitch VOD',
              updated_at: '2023-01-05T00:00:00Z',
              visible: true,
            },
          },
        ])
      }),
      http.post('*/rest/v1/videos', async ({ request }) => {
        const body = await request.json()
        const items = Array.isArray(body) ? body : [body]

        const insertedVideos = items.map(
          (item: Record<string, unknown>, index: number) => ({
            ...item,
            id: `new-uuid-${index + 1}`,
            talent: { name: 'Test Talent' },
            thumbnail: null,
          }),
        )

        // .single() expects an object; bulk insert expects an array
        const payload =
          Array.isArray(body) && body.length !== 1
            ? insertedVideos
            : (insertedVideos[0] ?? null)

        return HttpResponse.json(payload, { status: 201 })
      }),
      http.post('*/rest/v1/twitch_videos', async ({ request }) => {
        const body = await request.json()
        return HttpResponse.json(body, { status: 201 })
      }),
    )

    const currentDateTime = Temporal.Instant.from('2023-01-15T10:00:00Z')
    const originalVideos = [
      {
        created_at: '2023-01-10T12:00:00Z',
        description: '',
        duration: 'PT2H0M0S',
        id: 'new-twitch-1',
        language: 'ja',
        published_at: '2023-01-10T12:00:00Z',
        stream_id: 'stream-1',
        thumbnail_url:
          'https://static-cdn.jtvnw.net/cf_vods/example-%{width}x%{height}.jpg',
        title: 'New Twitch VOD',
        type: 'archive' as const,
        url: 'https://www.twitch.tv/videos/new-twitch-1',
        user_id: '100001',
        user_login: 'alice_twitch',
        user_name: 'Alice',
        view_count: 10,
        viewable: 'public',
      },
      {
        created_at: '2023-01-05T12:00:00Z',
        description: '',
        duration: 'PT1H0M0S',
        id: 'existing-twitch-1',
        language: 'ja',
        published_at: '2023-01-05T12:00:00Z',
        stream_id: 'stream-0',
        thumbnail_url:
          'https://static-cdn.jtvnw.net/cf_vods/example-%{width}x%{height}.jpg',
        title: 'Existing Twitch VOD',
        type: 'archive' as const,
        url: 'https://www.twitch.tv/videos/existing-twitch-1',
        user_id: '100001',
        user_login: 'alice_twitch',
        user_name: 'Alice',
        view_count: 5,
        viewable: 'public',
      },
    ]

    const result = await saveTwitchVideos({
      currentDateTime,
      originalVideos,
      supabaseClient,
      talentId: 'talent-123',
      twitchUserId: 'twitch-user-uuid-1',
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.title).toBe('New Twitch VOD')
    expect(result[0]?.twitch_video?.twitch_video_id).toBe('new-twitch-1')
  })

  it('should return empty array when all videos already exist', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    server.use(
      http.get('*/rest/v1/twitch_videos', () => {
        return HttpResponse.json([
          {
            twitch_video_id: 'existing-1',
            type: 'archive',
            video: {
              created_at: '2023-01-05T00:00:00Z',
              deleted_at: null,
              duration: 'PT1H0M0S',
              id: 'saved-uuid-1',
              platform: 'twitch',
              published_at: '2023-01-10T12:00:00Z',
              status: 'ENDED',
              talent_id: 'talent-123',
              thumbnail_id: null,
              title: 'Existing',
              updated_at: '2023-01-05T00:00:00Z',
              visible: true,
            },
          },
        ])
      }),
    )

    const currentDateTime = Temporal.Instant.from('2023-01-15T10:00:00Z')
    const result = await saveTwitchVideos({
      currentDateTime,
      originalVideos: [
        {
          created_at: '2023-01-10T12:00:00Z',
          description: '',
          duration: 'PT1H0M0S',
          id: 'existing-1',
          language: 'ja',
          published_at: '2023-01-10T12:00:00Z',
          stream_id: null,
          thumbnail_url: 'https://example.com/thumb.jpg',
          title: 'Existing',
          type: 'archive',
          url: 'https://www.twitch.tv/videos/existing-1',
          user_id: '100001',
          user_login: 'alice_twitch',
          user_name: 'Alice',
          view_count: 1,
          viewable: 'public',
        },
      ],
      supabaseClient,
      talentId: 'talent-123',
      twitchUserId: 'twitch-user-uuid-1',
    })

    expect(result).toHaveLength(0)
  })
})
