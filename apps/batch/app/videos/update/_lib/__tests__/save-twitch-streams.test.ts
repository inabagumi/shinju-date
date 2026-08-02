import { createClient } from '@supabase/supabase-js'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { Temporal } from 'temporal-polyfill'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { saveTwitchStreams } from '../save-twitch-streams'

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

describe('saveTwitchStreams', () => {
  it('inserts a LIVE row for a new stream', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    const twitchInserts: unknown[] = []

    server.use(
      http.get('*/rest/v1/twitch_videos', () => {
        return HttpResponse.json([])
      }),
      http.post('*/rest/v1/videos', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            ...body,
            id: 'new-live-uuid',
            talent: { name: 'Alice' },
            thumbnail: null,
          },
          { status: 201 },
        )
      }),
      http.post('*/rest/v1/twitch_videos', async ({ request }) => {
        const body = await request.json()
        twitchInserts.push(body)
        return HttpResponse.json(body, { status: 201 })
      }),
    )

    const result = await saveTwitchStreams({
      currentDateTime: Temporal.Instant.from('2023-01-15T10:00:00Z'),
      streams: [
        {
          game_id: '1',
          game_name: 'Game',
          id: 'stream-42',
          is_mature: false,
          language: 'ja',
          started_at: '2023-01-15T09:30:00Z',
          tags: [],
          thumbnail_url: 'https://example.com/{width}x{height}.jpg',
          title: 'Playing now',
          type: 'live',
          user_id: '100001',
          user_login: 'alice_twitch',
          user_name: 'Alice',
          viewer_count: 5,
        },
      ],
      supabaseClient,
      userToTalentMap: new Map([
        [
          '100001',
          {
            talentId: 'talent-123',
            twitchUserRowId: 'twitch-user-uuid-1',
          },
        ],
      ]),
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.status).toBe('LIVE')
    expect(result[0]?.title).toBe('Playing now')
    expect(twitchInserts[0]).toMatchObject({
      stream_id: 'stream-42',
      twitch_video_id: 'live:stream-42',
      type: null,
    })
  })

  it('updates title for an existing LIVE stream instead of inserting', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    const videoPatches: unknown[] = []
    let videoPosts = 0

    server.use(
      http.get('*/rest/v1/twitch_videos', ({ request }) => {
        const url = new URL(request.url)
        // stream_id or twitch_video_id lookup
        if (
          url.searchParams.get('stream_id') ||
          url.searchParams.get('twitch_video_id')
        ) {
          return HttpResponse.json([
            {
              stream_id: 'stream-42',
              twitch_video_id: 'live:stream-42',
              type: null,
              video: {
                created_at: '2023-01-15T09:30:00Z',
                deleted_at: null,
                duration: 'P0D',
                id: 'existing-live-uuid',
                platform: 'twitch',
                published_at: '2023-01-15T09:30:00Z',
                status: 'LIVE',
                talent_id: 'talent-123',
                thumbnail_id: null,
                title: 'Old title',
                updated_at: '2023-01-15T09:30:00Z',
                visible: true,
              },
            },
          ])
        }
        return HttpResponse.json([])
      }),
      http.patch('*/rest/v1/videos', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        videoPatches.push(body)
        return HttpResponse.json({
          ...body,
          duration: 'P0D',
          id: 'existing-live-uuid',
          published_at: '2023-01-15T09:30:00Z',
          talent: { name: 'Alice' },
          thumbnail: null,
        })
      }),
      http.post('*/rest/v1/videos', () => {
        videoPosts += 1
        return HttpResponse.json({}, { status: 201 })
      }),
    )

    const result = await saveTwitchStreams({
      currentDateTime: Temporal.Instant.from('2023-01-15T10:00:00Z'),
      streams: [
        {
          game_id: '1',
          game_name: 'Game',
          id: 'stream-42',
          is_mature: false,
          language: 'ja',
          started_at: '2023-01-15T09:30:00Z',
          tags: [],
          thumbnail_url: 'https://example.com/{width}x{height}.jpg',
          title: 'New title',
          type: 'live',
          user_id: '100001',
          user_login: 'alice_twitch',
          user_name: 'Alice',
          viewer_count: 5,
        },
      ],
      supabaseClient,
      userToTalentMap: new Map([
        [
          '100001',
          {
            talentId: 'talent-123',
            twitchUserRowId: 'twitch-user-uuid-1',
          },
        ],
      ]),
    })

    expect(videoPosts).toBe(0)
    expect(videoPatches).toHaveLength(1)
    expect(videoPatches[0]).toMatchObject({
      status: 'LIVE',
      title: 'New title',
    })
    expect(result).toHaveLength(1)
  })
})
