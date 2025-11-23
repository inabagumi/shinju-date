import { supabaseHandlers } from '@shinju-date/msw-handlers'
import { createClient } from '@supabase/supabase-js'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getSavedVideos } from '../get-saved-videos'

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

describe('getSavedVideos', () => {
  it('should fetch latest 100 videos regardless of status in recent mode', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    // Mock the response with videos of different statuses
    server.use(
      http.get('*/rest/v1/videos', ({ request }) => {
        const url = new URL(request.url)
        const select = url.searchParams.get('select')
        const deletedAt = url.searchParams.get('deleted_at')
        const limit = url.searchParams.get('limit')
        const order = url.searchParams.get('order')

        // Verify that the query parameters are correct
        expect(select).toContain('id')
        expect(select).toContain('youtube_video:youtube_videos')
        expect(deletedAt).toBe('is.null')
        expect(limit).toBe('100')
        expect(order).toBe('published_at.desc')

        // Verify that status filter is NOT present
        const status = url.searchParams.get('status')
        expect(status).toBeNull()

        // Return mock data with mixed statuses
        return HttpResponse.json([
          {
            duration: 'PT10M30S',
            id: 'video-1',
            published_at: '2023-01-03T12:00:00Z',
            status: 'ENDED',
            title: 'Test Video 1',
            youtube_video: { youtube_video_id: 'YT_video1' },
          },
          {
            duration: 'PT5M15S',
            id: 'video-2',
            published_at: '2023-01-02T12:00:00Z',
            status: 'LIVE',
            title: 'Test Video 2',
            youtube_video: { youtube_video_id: 'YT_video2' },
          },
          {
            duration: 'PT15M45S',
            id: 'video-3',
            published_at: '2023-01-01T12:00:00Z',
            status: 'UPCOMING',
            title: 'Test Video 3',
            youtube_video: { youtube_video_id: 'YT_video3' },
          },
        ])
      }),
    )

    const savedVideos = await Array.fromAsync(
      getSavedVideos({
        mode: 'recent',
        supabaseClient,
      }),
    )

    // Should return all videos regardless of status
    expect(savedVideos).toHaveLength(3)
    expect(savedVideos[0]?.status).toBe('ENDED')
    expect(savedVideos[1]?.status).toBe('LIVE')
    expect(savedVideos[2]?.status).toBe('UPCOMING')
  })

  it('should only fetch UPCOMING/LIVE videos in default mode', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    server.use(
      http.get('*/rest/v1/videos', ({ request }) => {
        const url = new URL(request.url)
        const status = url.searchParams.get('status')

        // Verify that status filter is present for default mode
        expect(status).toBe('in.(UPCOMING,LIVE)')

        return HttpResponse.json([
          {
            duration: 'PT5M15S',
            id: 'video-1',
            published_at: '2023-01-02T12:00:00Z',
            status: 'LIVE',
            title: 'Test Video 1',
            youtube_video: { youtube_video_id: 'YT_video1' },
          },
          {
            duration: 'PT15M45S',
            id: 'video-2',
            published_at: '2023-01-01T12:00:00Z',
            status: 'UPCOMING',
            title: 'Test Video 2',
            youtube_video: { youtube_video_id: 'YT_video2' },
          },
        ])
      }),
    )

    const savedVideos = await Array.fromAsync(
      getSavedVideos({
        mode: 'default',
        supabaseClient,
      }),
    )

    // Should only return UPCOMING/LIVE videos
    expect(savedVideos).toHaveLength(2)
    expect(savedVideos[0]?.status).toBe('LIVE')
    expect(savedVideos[1]?.status).toBe('UPCOMING')
  })

  it('should fetch all videos in batches for all mode', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    server.use(
      http.get('*/rest/v1/videos', ({ request }) => {
        const url = new URL(request.url)
        const select = url.searchParams.get('select')

        // Check if this is a count request
        if (select === '*') {
          return new HttpResponse(null, {
            headers: {
              'Content-Range': '0-0/100',
            },
            status: 200,
          })
        }

        // Return first batch
        return HttpResponse.json([
          {
            duration: 'PT10M30S',
            id: 'video-1',
            published_at: '2023-01-03T12:00:00Z',
            status: 'ENDED',
            title: 'Test Video 1',
            youtube_video: { youtube_video_id: 'YT_video1' },
          },
        ])
      }),
    )

    const savedVideos = await Array.fromAsync(
      getSavedVideos({
        mode: 'all',
        supabaseClient,
      }),
    )

    expect(savedVideos).toBeDefined()
  })
})
