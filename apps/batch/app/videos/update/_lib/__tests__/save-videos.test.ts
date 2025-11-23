import { supabaseHandlers } from '@shinju-date/msw-handlers'
import { createClient } from '@supabase/supabase-js'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { Temporal } from 'temporal-polyfill'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { saveScrapedVideos } from '../save-videos'

// Setup MSW server with handlers
const server = setupServer(...supabaseHandlers)

// Mock Supabase URL and key for testing
const MOCK_SUPABASE_URL = 'https://fake.supabase.test'
const MOCK_SUPABASE_ANON_KEY = 'mock-anon-key'

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers()
})

// Close server after all tests
afterAll(() => {
  server.close()
})

describe('saveScrapedVideos', () => {
  it('should only save new videos and skip existing ones', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    // Mock the youtube_videos query to return one existing video
    server.use(
      http.get('*/rest/v1/youtube_videos', () => {
        return HttpResponse.json([
          {
            video: {
              created_at: '2023-01-05T00:00:00Z',
              deleted_at: null,
              duration: 'PT15M00S',
              id: 'saved-uuid-1',
              platform: 'youtube',
              published_at: '2023-01-05T12:00:00Z',
              status: 'ENDED',
              talent_id: 'talent-123',
              thumbnail_id: 'thumb-1',
              title: 'Existing Video 1',
              updated_at: '2023-01-05T00:00:00Z',
              visible: true,
            },
            youtube_video_id: 'existing-video-1',
          },
        ])
      }),
      http.post('*/rest/v1/videos', async ({ request }) => {
        const body = await request.json()
        const items = Array.isArray(body) ? body : [body]

        const insertedVideos = items.map((item, index) => ({
          ...item,
          id: `new-uuid-${index + 1}`,
          talent: { name: 'Test Talent' },
          thumbnail: null,
        }))

        return HttpResponse.json(insertedVideos, { status: 201 })
      }),
      http.post('*/rest/v1/youtube_videos', async ({ request }) => {
        const body = await request.json()
        return HttpResponse.json(body, { status: 201 })
      }),
    )

    const currentDateTime = Temporal.Instant.from('2023-01-15T10:00:00Z')
    const originalVideos = [
      {
        contentDetails: { duration: 'PT10M30S' },
        id: 'new-video-1',
        liveStreamingDetails: {},
        snippet: {
          publishedAt: '2023-01-10T12:00:00Z',
          title: 'New Video 1',
        },
      },
      {
        contentDetails: { duration: 'PT15M45S' },
        id: 'existing-video-1',
        liveStreamingDetails: {},
        snippet: {
          publishedAt: '2023-01-05T12:00:00Z',
          title: 'Existing Video 1',
        },
      },
    ]

    const result = await saveScrapedVideos({
      currentDateTime,
      originalVideos,
      supabaseClient,
      talentId: 'talent-123',
      youtubeChannelId: 'channel-123',
    })

    // Should only insert 1 new video (new-video-1), skip existing-video-1
    expect(result).toHaveLength(1)
    expect(result[0]?.title).toBe('New Video 1')
  })

  it('should return empty array when all videos already exist', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    server.use(
      http.get('*/rest/v1/youtube_videos', () => {
        return HttpResponse.json([
          {
            video: {
              created_at: '2023-01-05T00:00:00Z',
              deleted_at: null,
              duration: 'PT10M30S',
              id: 'saved-uuid-1',
              platform: 'youtube',
              published_at: '2023-01-10T12:00:00Z',
              status: 'ENDED',
              talent_id: 'talent-123',
              thumbnail_id: 'thumb-1',
              title: 'Existing Video 1',
              updated_at: '2023-01-05T00:00:00Z',
              visible: true,
            },
            youtube_video_id: 'existing-1',
          },
        ])
      }),
    )

    const currentDateTime = Temporal.Instant.from('2023-01-15T10:00:00Z')
    const originalVideos = [
      {
        contentDetails: { duration: 'PT10M30S' },
        id: 'existing-1',
        liveStreamingDetails: {},
        snippet: {
          publishedAt: '2023-01-10T12:00:00Z',
          title: 'Existing Video 1',
        },
      },
    ]

    const result = await saveScrapedVideos({
      currentDateTime,
      originalVideos,
      supabaseClient,
      talentId: 'talent-123',
      youtubeChannelId: 'channel-123',
    })

    // Should return empty array as all videos already exist
    expect(result).toHaveLength(0)
  })
})
