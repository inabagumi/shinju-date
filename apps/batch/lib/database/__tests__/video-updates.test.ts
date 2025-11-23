import { supabaseHandlers } from '@shinju-date/msw-handlers'
import { createClient } from '@supabase/supabase-js'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { Temporal } from 'temporal-polyfill'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { processScrapedVideoForCheck } from '../video-updates'

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

describe('processScrapedVideoForCheck with >50 videos', () => {
  it('should handle more than 50 videos without deleting available videos', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    // Create 100 saved videos
    const savedVideos = Array.from({ length: 100 }, (_, i) => ({
      duration: 'PT10M30S',
      id: `video-${i + 1}`,
      published_at: '2023-01-01T12:00:00Z',
      status: 'ENDED' as const,
      thumbnails: { id: `thumb-${i + 1}` },
      title: `Test Video ${i + 1}`,
      youtube_video: {
        youtube_video_id: `YT_video${i + 1}`,
      },
    }))

    // Mock YouTube API returning all 100 videos
    const originalVideos = Array.from({ length: 100 }, (_, i) => ({
      contentDetails: {
        duration: 'PT10M30S',
      },
      id: `YT_video${i + 1}`,
      liveStreamingDetails: undefined,
      snippet: {
        publishedAt: '2023-01-01T12:00:00Z',
        title: `Test Video ${i + 1}`,
      },
    }))

    // Track DB operations
    const deletedVideoIds: string[] = []
    const updatedVideoIds: string[] = []

    server.use(
      // Mock video updates
      http.post('*/rest/v1/videos', async ({ request }) => {
        const body = (await request.json()) as
          | Array<{ id: string }>
          | { id: string }
        const items = Array.isArray(body) ? body : [body]
        for (const item of items) {
          updatedVideoIds.push(item.id)
        }
        return HttpResponse.json(items, { status: 201 })
      }),
      // Mock video deletions
      http.patch('*/rest/v1/videos', async ({ request }) => {
        const url = new URL(request.url)
        const ids = url.searchParams.get('id')?.split(',') || []
        deletedVideoIds.push(...ids)
        return HttpResponse.json(
          ids.map((id) => ({ id })),
          { status: 200 },
        )
      }),
    )

    const currentDateTime = Temporal.Now.instant()
    const logger = {
      info: () => {},
    }

    // Process all 100 videos at once
    await processScrapedVideoForCheck({
      currentDateTime,
      logger,
      mode: 'recent',
      originalVideos,
      savedVideos,
      supabaseClient,
    })

    // Verify no videos were deleted (all were available)
    expect(deletedVideoIds).toHaveLength(0)
  })

  it('should correctly delete unavailable videos when processing >50 videos', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )

    // Create 100 saved videos
    const savedVideos = Array.from({ length: 100 }, (_, i) => ({
      duration: 'PT10M30S',
      id: `video-${i + 1}`,
      published_at: '2023-01-01T12:00:00Z',
      status: 'ENDED' as const,
      thumbnails: { id: `thumb-${i + 1}` },
      title: `Test Video ${i + 1}`,
      youtube_video: {
        youtube_video_id: `YT_video${i + 1}`,
      },
    }))

    // Mock YouTube API returning only 95 videos (5 are unavailable: videos 10, 30, 50, 70, 90)
    const originalVideos = Array.from({ length: 100 }, (_, i) => {
      const videoNum = i + 1
      // Skip videos 10, 30, 50, 70, 90
      if ([10, 30, 50, 70, 90].includes(videoNum)) {
        return null
      }
      return {
        contentDetails: {
          duration: 'PT10M30S',
        },
        id: `YT_video${videoNum}`,
        liveStreamingDetails: undefined,
        snippet: {
          publishedAt: '2023-01-01T12:00:00Z',
          title: `Test Video ${videoNum}`,
        },
      }
    }).filter(Boolean) as Array<{
      id: string
      contentDetails: { duration: string }
      snippet: { title: string; publishedAt: string }
      liveStreamingDetails: undefined
    }>

    // Track DB operations
    const deletedVideoIds: string[] = []

    server.use(
      // Mock video deletions
      http.patch('*/rest/v1/videos', async ({ request }) => {
        const url = new URL(request.url)
        const idParam = url.searchParams.get('id') || ''
        // Parse format: "in.(video-10,video-30,video-50)"
        const match = idParam.match(/in\.\((.*)\)/)
        if (match) {
          const ids = match[1].split(',')
          deletedVideoIds.push(...ids)
          return HttpResponse.json(
            ids.map((id) => ({ id })),
            { status: 200 },
          )
        }
        return HttpResponse.json([], { status: 200 })
      }),
      // Mock thumbnail deletions
      http.patch('*/rest/v1/thumbnails', async ({ request }) => {
        const url = new URL(request.url)
        const idParam = url.searchParams.get('id') || ''
        const match = idParam.match(/in\.\((.*)\)/)
        if (match) {
          const ids = match[1].split(',')
          return HttpResponse.json(
            ids.map((id) => ({ id })),
            { status: 200 },
          )
        }
        return HttpResponse.json([], { status: 200 })
      }),
    )

    const currentDateTime = Temporal.Now.instant()
    const logger = {
      info: () => {},
    }

    // Process 95 available videos (5 are missing)
    await processScrapedVideoForCheck({
      currentDateTime,
      logger,
      mode: 'recent',
      originalVideos,
      savedVideos,
      supabaseClient,
    })

    // Verify exactly 5 videos were deleted
    expect(deletedVideoIds).toHaveLength(5)
    expect(deletedVideoIds).toContain('video-10')
    expect(deletedVideoIds).toContain('video-30')
    expect(deletedVideoIds).toContain('video-50')
    expect(deletedVideoIds).toContain('video-70')
    expect(deletedVideoIds).toContain('video-90')
  })
})
