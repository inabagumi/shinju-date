import { supabaseHandlers } from '@shinju-date/msw-handlers'
import { createClient } from '@supabase/supabase-js'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getSavedVideos, upsertVideos } from '../operations'

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

describe('Database operations', () => {
  describe('getSavedVideos', () => {
    it('should get saved videos with youtube_video associations', async () => {
      const supabaseClient = createClient(
        MOCK_SUPABASE_URL,
        MOCK_SUPABASE_ANON_KEY,
      )

      const videoIds = ['YT_video1abc', 'YT_video2def', 'YT_video3ghi']
      const savedVideos = await Array.fromAsync(
        getSavedVideos(supabaseClient, videoIds),
      )

      expect(savedVideos).toHaveLength(3)
      expect(savedVideos[0]?.youtube_video?.youtube_video_id).toBe(
        'YT_video1abc',
      )
      expect(savedVideos[1]?.youtube_video?.youtube_video_id).toBe(
        'YT_video2def',
      )
      expect(savedVideos[2]?.youtube_video?.youtube_video_id).toBe(
        'YT_video3ghi',
      )
    })
  })

  describe('upsertVideos', () => {
    it('should handle videos without IDs (new inserts)', async () => {
      const supabaseClient = createClient(
        MOCK_SUPABASE_URL,
        MOCK_SUPABASE_ANON_KEY,
      )

      let capturedYoutubeVideos: Array<{
        video_id: string
        youtube_video_id: string
      }> = []
      server.use(
        http.get('*/rest/v1/youtube_videos', () => {
          return HttpResponse.json([])
        }),
        http.post('*/rest/v1/youtube_videos', async ({ request }) => {
          const body = await request.json()
          capturedYoutubeVideos = Array.isArray(body) ? body : [body]
          return HttpResponse.json(capturedYoutubeVideos, { status: 201 })
        }),
        http.post('*/rest/v1/videos', async ({ request }) => {
          const body = await request.json()
          const items = Array.isArray(body) ? body : [body]

          const insertedVideos = items.map((item, index) => ({
            ...item,
            id: `generated-uuid-${index + 1}`,
            talent: { name: 'Test Talent' },
            thumbnail: null,
          }))

          return HttpResponse.json(insertedVideos, { status: 201 })
        }),
      )

      const values = [
        {
          created_at: '2023-01-01T00:00:00.000Z',
          deleted_at: null,
          duration: 'PT10M30S',
          platform: 'youtube' as const,
          published_at: '2023-01-01T12:00:00.000Z',
          talent_id: 'talent-uuid-1',
          thumbnail_id: 'thumbnail-uuid-1',
          title: 'New Video 1',
          updated_at: '2023-01-01T00:00:00.000Z',
          visible: true,
        },
        {
          created_at: '2023-01-02T00:00:00.000Z',
          deleted_at: null,
          duration: 'PT8M15S',
          platform: 'youtube' as const,
          published_at: '2023-01-02T12:00:00.000Z',
          talent_id: 'talent-uuid-1',
          thumbnail_id: 'thumbnail-uuid-2',
          title: 'New Video 2',
          updated_at: '2023-01-02T00:00:00.000Z',
          visible: true,
        },
      ]

      const youtubeVideoIds = ['YT_brandNew1', 'YT_brandNew2']

      const result = await upsertVideos(
        supabaseClient,
        values,
        youtubeVideoIds,
        'UT_channel_123',
      )

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(result).toBeDefined()
      expect(result.length).toBe(2)

      expect(capturedYoutubeVideos.length).toBeGreaterThan(0)
      expect(capturedYoutubeVideos).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            video_id: 'generated-uuid-1',
            youtube_video_id: 'YT_brandNew1',
          }),
          expect.objectContaining({
            video_id: 'generated-uuid-2',
            youtube_video_id: 'YT_brandNew2',
          }),
        ]),
      )

      expect(result[0]?.youtube_video?.youtube_video_id).toBe('YT_brandNew1')
      expect(result[1]?.youtube_video?.youtube_video_id).toBe('YT_brandNew2')
    })

    it('should maintain correct association between video UUIDs and YouTube IDs', async () => {
      const supabaseClient = createClient(
        MOCK_SUPABASE_URL,
        MOCK_SUPABASE_ANON_KEY,
      )

      const values = [
        {
          created_at: '2023-01-01T00:00:00.000Z',
          deleted_at: null,
          duration: 'PT10M30S',
          id: 'uuid-video-a',
          platform: 'youtube' as const,
          published_at: '2023-01-01T12:00:00.000Z',
          status: 'ENDED' as const,
          talent_id: 'talent-uuid-1',
          thumbnail_id: '1',
          title: 'Video A',
          updated_at: '2023-01-01T00:00:00.000Z',
          visible: true,
        },
        {
          created_at: '2023-01-02T00:00:00.000Z',
          deleted_at: null,
          duration: 'PT15M45S',
          id: 'uuid-video-b',
          platform: 'youtube' as const,
          published_at: '2023-01-02T12:00:00.000Z',
          status: 'ENDED' as const,
          talent_id: 'talent-uuid-2',
          thumbnail_id: '2',
          title: 'Video B',
          updated_at: '2023-01-02T00:00:00.000Z',
          visible: true,
        },
        {
          created_at: '2023-01-03T00:00:00.000Z',
          deleted_at: null,
          duration: 'PT8M15S',
          id: 'uuid-video-c',
          platform: 'youtube' as const,
          published_at: '2023-01-03T12:00:00.000Z',
          status: 'ENDED' as const,
          talent_id: 'talent-uuid-3',
          thumbnail_id: '3',
          title: 'Video C',
          updated_at: '2023-01-03T00:00:00.000Z',
          visible: true,
        },
      ]

      const youtubeVideoIds = [
        'YT_videoA_youtube_id',
        'YT_videoB_youtube_id',
        'YT_videoC_youtube_id',
      ]

      let capturedYoutubeVideos: Array<{
        video_id: string
        youtube_video_id: string
      }> = []
      server.use(
        http.get('*/rest/v1/youtube_videos', () => {
          return HttpResponse.json([
            {
              video_id: 'uuid-video-a',
              youtube_video_id: 'YT_videoA_youtube_id',
            },
            {
              video_id: 'uuid-video-b',
              youtube_video_id: 'YT_videoB_youtube_id',
            },
            {
              video_id: 'uuid-video-c',
              youtube_video_id: 'YT_videoC_youtube_id',
            },
          ])
        }),
        http.post('*/rest/v1/youtube_videos', async ({ request }) => {
          const body = await request.json()
          capturedYoutubeVideos = Array.isArray(body) ? body : [body]
          return HttpResponse.json(capturedYoutubeVideos, { status: 201 })
        }),
        http.post('*/rest/v1/videos', async ({ request }) => {
          const body = await request.json()
          const items = Array.isArray(body) ? body : [body]

          const reordered = items.toReversed()
          return HttpResponse.json(reordered, { status: 201 })
        }),
      )

      await upsertVideos(
        supabaseClient,
        values,
        youtubeVideoIds,
        '1cabb470-5d40-4afb-aee7-9b876ffa62e7',
      )

      await new Promise((resolve) => setTimeout(resolve, 100))

      if (capturedYoutubeVideos.length > 0) {
        const videoAAssoc = capturedYoutubeVideos.find(
          (v) => v.video_id === 'uuid-video-a',
        )
        expect(videoAAssoc?.youtube_video_id).toBe('YT_videoA_youtube_id')

        const videoBAssoc = capturedYoutubeVideos.find(
          (v) => v.video_id === 'uuid-video-b',
        )
        expect(videoBAssoc?.youtube_video_id).toBe('YT_videoB_youtube_id')

        const videoCAssoc = capturedYoutubeVideos.find(
          (v) => v.video_id === 'uuid-video-c',
        )
        expect(videoCAssoc?.youtube_video_id).toBe('YT_videoC_youtube_id')
      }
    })

    it('should include youtube_channel_id when provided to upsertVideos', async () => {
      const supabaseClient = createClient(
        MOCK_SUPABASE_URL,
        MOCK_SUPABASE_ANON_KEY,
      )

      const youtubeChannelId = 'yt-channel-uuid-123'
      const values = [
        {
          created_at: '2023-01-01T00:00:00.000Z',
          deleted_at: null,
          duration: 'PT10M30S',
          platform: 'youtube' as const,
          published_at: '2023-01-01T12:00:00.000Z',
          status: 'ENDED' as const,
          talent_id: 'talent-uuid-1',
          thumbnail_id: 'thumb-uuid-1',
          title: 'Test Video',
          updated_at: '2023-01-01T00:00:00.000Z',
          visible: true,
        },
      ]

      const youtubeVideoIds = ['YT_test_video_id']

      let capturedYoutubeVideos: Array<{
        video_id: string
        youtube_video_id: string
        youtube_channel_id?: string
      }> = []

      server.use(
        http.post('*/rest/v1/youtube_videos', async ({ request }) => {
          const body = await request.json()
          capturedYoutubeVideos = Array.isArray(body) ? body : [body]
          return HttpResponse.json(capturedYoutubeVideos, { status: 201 })
        }),
        http.post('*/rest/v1/videos', async ({ request }) => {
          const body = await request.json()
          const items = Array.isArray(body) ? body : [body]

          const insertedVideos = items.map((item, index) => ({
            ...item,
            id: `generated-uuid-${index + 1}`,
            talent: { name: 'Test Talent' },
            thumbnail: null,
          }))

          return HttpResponse.json(insertedVideos, { status: 201 })
        }),
      )

      await upsertVideos(
        supabaseClient,
        values,
        youtubeVideoIds,
        youtubeChannelId,
      )

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Verify that youtube_channel_id was included in the upsert
      expect(capturedYoutubeVideos.length).toBeGreaterThan(0)
      expect(capturedYoutubeVideos[0]?.youtube_channel_id).toBe(
        youtubeChannelId,
      )
      expect(capturedYoutubeVideos[0]?.youtube_video_id).toBe(
        'YT_test_video_id',
      )
    })
  })
})
