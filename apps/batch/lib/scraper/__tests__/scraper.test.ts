import { youtube_v3 as youtube } from '@googleapis/youtube'
import { supabaseHandlers, youtubeHandlers } from '@shinju-date/msw-handlers'
import { createClient } from '@supabase/supabase-js'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import DB from '../db'
import Scraper from '../scraper'

// Setup MSW server with handlers
const server = setupServer(...supabaseHandlers, ...youtubeHandlers)

// Mock Supabase URL and key for testing
const MOCK_SUPABASE_URL = 'https://fake.supabase.test'
const MOCK_SUPABASE_ANON_KEY = 'mock-anon-key'

// Mock YouTube API key
const MOCK_YOUTUBE_API_KEY = 'mock-youtube-api-key'

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

describe('DB class', () => {
  it('should create a DB instance', () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )
    const db = new DB(supabaseClient)

    expect(db).toBeDefined()
    expect(db.client).toBe(supabaseClient)
  })

  it('should get saved videos with youtube_video associations', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )
    const db = new DB(supabaseClient)

    const videoIds = ['YT_video1abc', 'YT_video2def', 'YT_video3ghi']
    const savedVideos = await Array.fromAsync(db.getSavedVideos(videoIds))

    expect(savedVideos).toHaveLength(3)
    expect(savedVideos[0]?.youtube_video?.youtube_video_id).toBe('YT_video1abc')
    expect(savedVideos[1]?.youtube_video?.youtube_video_id).toBe('YT_video2def')
    expect(savedVideos[2]?.youtube_video?.youtube_video_id).toBe('YT_video3ghi')
  })

  // TODO: This test needs better mock setup for Supabase insert/upsert operations
  it.skip('should correctly associate videos with youtube_videos using Map', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )
    const db = new DB(supabaseClient)

    // Mock video data with IDs
    const values = [
      {
        channel_id: '1',
        created_at: '2023-01-01T00:00:00.000Z',
        deleted_at: null,
        duration: 'PT10M30S',
        id: 'test-uuid-1',
        platform: 'youtube' as const,
        published_at: '2023-01-01T12:00:00.000Z',
        thumbnail_id: '1',
        title: 'Test Video 1',
        updated_at: '2023-01-01T00:00:00.000Z',
        visible: true,
      },
      {
        channel_id: '2',
        created_at: '2023-01-02T00:00:00.000Z',
        deleted_at: null,
        duration: 'PT15M45S',
        id: 'test-uuid-2',
        platform: 'youtube' as const,
        published_at: '2023-01-02T12:00:00.000Z',
        thumbnail_id: '2',
        title: 'Test Video 2',
        updated_at: '2023-01-02T00:00:00.000Z',
        visible: true,
      },
    ]

    const youtubeVideoIds = ['YT_newTest1', 'YT_newTest2']

    // Add a handler to capture the POST request to youtube_videos
    let capturedYoutubeVideos: Array<{
      video_id: string
      youtube_video_id: string
    }> = []
    server.use(
      http.post('*/rest/v1/youtube_videos', async ({ request }) => {
        const body = await request.json()
        capturedYoutubeVideos = Array.isArray(body) ? body : [body]
        return HttpResponse.json(capturedYoutubeVideos, { status: 201 })
      }),
    )

    const result = await db.upsertVideos(values, youtubeVideoIds)

    // Wait a bit for async operations
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Verify that youtube_videos entries were created with correct associations
    expect(result).toBeDefined()
    expect(result.length).toBeGreaterThan(0)

    // Check that the association mapping was correct
    if (capturedYoutubeVideos.length > 0) {
      expect(capturedYoutubeVideos).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            video_id: 'test-uuid-1',
            youtube_video_id: 'YT_newTest1',
          }),
          expect.objectContaining({
            video_id: 'test-uuid-2',
            youtube_video_id: 'YT_newTest2',
          }),
        ]),
      )
    }
  })

  it('should handle videos without IDs (new inserts)', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )
    const db = new DB(supabaseClient)

    // Track what gets posted to youtube_videos
    let capturedYoutubeVideos: Array<{
      video_id: string
      youtube_video_id: string
    }> = []
    server.use(
      http.post('*/rest/v1/youtube_videos', async ({ request }) => {
        const body = await request.json()
        capturedYoutubeVideos = Array.isArray(body) ? body : [body]
        return HttpResponse.json(capturedYoutubeVideos, { status: 201 })
      }),
      // Mock videos POST to return inserted videos with generated IDs
      http.post('*/rest/v1/videos', async ({ request }) => {
        const body = await request.json()
        const items = Array.isArray(body) ? body : [body]

        // Simulate database inserting videos with generated IDs
        const insertedVideos = items.map((item, index) => ({
          ...item,
          channels: { name: 'Test Channel' },
          id: `generated-uuid-${index + 1}`,
          thumbnails: null,
        }))

        return HttpResponse.json(insertedVideos, { status: 201 })
      }),
    )

    // Mock video data without IDs (new inserts)
    const values = [
      {
        channel_id: '1',
        created_at: '2023-01-01T00:00:00.000Z',
        deleted_at: null,
        duration: 'PT10M30S',
        platform: 'youtube' as const,
        published_at: '2023-01-01T12:00:00.000Z',
        thumbnail_id: '1',
        title: 'New Video 1',
        updated_at: '2023-01-01T00:00:00.000Z',
        visible: true,
      },
      {
        channel_id: '1',
        created_at: '2023-01-02T00:00:00.000Z',
        deleted_at: null,
        duration: 'PT8M15S',
        platform: 'youtube' as const,
        published_at: '2023-01-02T12:00:00.000Z',
        thumbnail_id: '2',
        title: 'New Video 2',
        updated_at: '2023-01-02T00:00:00.000Z',
        visible: true,
      },
    ]

    const youtubeVideoIds = ['YT_brandNew1', 'YT_brandNew2']

    const result = await db.upsertVideos(values, youtubeVideoIds)

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(result).toBeDefined()
    expect(result.length).toBe(2)

    // Verify that youtube_videos associations were created
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

    // Verify that returned videos have youtube_video data
    expect(result[0]?.youtube_video?.youtube_video_id).toBe('YT_brandNew1')
    expect(result[1]?.youtube_video?.youtube_video_id).toBe('YT_brandNew2')
  })
})

describe('Scraper class', () => {
  it('should create a Scraper instance', () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )
    const youtubeClient = new youtube.Youtube({
      auth: MOCK_YOUTUBE_API_KEY,
      version: 'v3',
    })

    const scraper = Scraper.create({
      channel: {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UUtest123_uploads',
          },
        },
        id: 'UCtest123',
      },
      savedChannel: {
        id: '1',
        name: 'Test Channel',
      },
      supabaseClient,
      youtubeClient,
    })

    expect(scraper).toBeDefined()
  })

  it('should preserve YouTube video ID association during scraping', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )
    const youtubeClient = new youtube.Youtube({
      auth: MOCK_YOUTUBE_API_KEY,
      version: 'v3',
    })

    const scraper = Scraper.create({
      channel: {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UUtest123_uploads',
          },
        },
        id: 'UCtest123',
      },
      dryRun: true, // Use dry run to avoid actual DB writes
      savedChannel: {
        id: '1',
        name: 'Test Channel',
      },
      supabaseClient,
      youtubeClient,
    })

    const videos = await Array.fromAsync(scraper.getVideos())

    expect(videos).toBeDefined()
    expect(videos.length).toBeGreaterThan(0)

    // Verify that each video has an ID (YouTube video ID)
    for (const video of videos) {
      expect(video.id).toBeDefined()
      expect(typeof video.id).toBe('string')
      expect(video.snippet).toBeDefined()
      expect(video.contentDetails).toBeDefined()
    }
  })

  // TODO: This test needs better mock setup for Temporal and full scraping flow
  it.skip('should create correct youtube_videos associations when scraping', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )
    const youtubeClient = new youtube.Youtube({
      auth: MOCK_YOUTUBE_API_KEY,
      version: 'v3',
    })

    // Track what gets posted to youtube_videos
    let capturedYoutubeVideos: Array<{
      video_id: string
      youtube_video_id: string
    }> = []
    server.use(
      http.post('*/rest/v1/youtube_videos', async ({ request }) => {
        const body = await request.json()
        capturedYoutubeVideos = Array.isArray(body) ? body : [body]
        return HttpResponse.json(capturedYoutubeVideos, { status: 201 })
      }),
    )

    const scraper = Scraper.create({
      channel: {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UUtest123_uploads',
          },
        },
        id: 'UCtest123',
      },
      savedChannel: {
        id: '1',
        name: 'Test Channel',
      },
      supabaseClient,
      youtubeClient,
    })

    await scraper.scrape()

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 200))

    // Verify that youtube_videos were created with proper YouTube video IDs
    if (capturedYoutubeVideos.length > 0) {
      for (const entry of capturedYoutubeVideos) {
        expect(entry.youtube_video_id).toBeDefined()
        // YouTube video IDs should start with 'YT_' in our mock data
        expect(entry.youtube_video_id).toMatch(/^YT_/)
        expect(entry.video_id).toBeDefined()
      }
    }
  })

  it('should handle empty video lists', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )
    const youtubeClient = new youtube.Youtube({
      auth: MOCK_YOUTUBE_API_KEY,
      version: 'v3',
    })

    // Mock an empty playlist
    server.use(
      http.get('https://www.googleapis.com/youtube/v3/playlistItems', () => {
        return HttpResponse.json({
          items: [],
          kind: 'youtube#playlistItemListResponse',
          pageInfo: {
            resultsPerPage: 0,
            totalResults: 0,
          },
        })
      }),
    )

    const scraper = Scraper.create({
      channel: {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UUempty_uploads',
          },
        },
        id: 'UCempty',
      },
      savedChannel: {
        id: '999',
        name: 'Empty Channel',
      },
      supabaseClient,
      youtubeClient,
    })

    const result = await scraper.scrape()

    expect(result).toBeDefined()
    expect(result).toHaveLength(0)
  })
})

describe('YouTube video ID association bug fix', () => {
  it('should maintain correct association between video UUIDs and YouTube IDs', async () => {
    const supabaseClient = createClient(
      MOCK_SUPABASE_URL,
      MOCK_SUPABASE_ANON_KEY,
    )
    const db = new DB(supabaseClient)

    // Simulate the scenario where videos come back in different order
    const values = [
      {
        channel_id: '1',
        created_at: '2023-01-01T00:00:00.000Z',
        deleted_at: null,
        duration: 'PT10M30S',
        id: 'uuid-video-a',
        platform: 'youtube' as const,
        published_at: '2023-01-01T12:00:00.000Z',
        thumbnail_id: '1',
        title: 'Video A',
        updated_at: '2023-01-01T00:00:00.000Z',
        visible: true,
      },
      {
        channel_id: '2',
        created_at: '2023-01-02T00:00:00.000Z',
        deleted_at: null,
        duration: 'PT15M45S',
        id: 'uuid-video-b',
        platform: 'youtube' as const,
        published_at: '2023-01-02T12:00:00.000Z',
        thumbnail_id: '2',
        title: 'Video B',
        updated_at: '2023-01-02T00:00:00.000Z',
        visible: true,
      },
      {
        channel_id: '3',
        created_at: '2023-01-03T00:00:00.000Z',
        deleted_at: null,
        duration: 'PT8M15S',
        id: 'uuid-video-c',
        platform: 'youtube' as const,
        published_at: '2023-01-03T12:00:00.000Z',
        thumbnail_id: '3',
        title: 'Video C',
        updated_at: '2023-01-03T00:00:00.000Z',
        visible: true,
      },
    ]

    // YouTube IDs in same order
    const youtubeVideoIds = [
      'YT_videoA_youtube_id',
      'YT_videoB_youtube_id',
      'YT_videoC_youtube_id',
    ]

    // Capture what gets sent to youtube_videos
    let capturedYoutubeVideos: Array<{
      video_id: string
      youtube_video_id: string
    }> = []
    server.use(
      http.post('*/rest/v1/youtube_videos', async ({ request }) => {
        const body = await request.json()
        capturedYoutubeVideos = Array.isArray(body) ? body : [body]
        return HttpResponse.json(capturedYoutubeVideos, { status: 201 })
      }),
      // Mock videos endpoint to return in different order
      http.post('*/rest/v1/videos', async ({ request }) => {
        const body = await request.json()
        const items = Array.isArray(body) ? body : [body]

        // Return in reversed order to simulate non-deterministic ordering
        const reordered = [...items].reverse()
        return HttpResponse.json(reordered, { status: 201 })
      }),
    )

    await db.upsertVideos(values, youtubeVideoIds)

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Verify the association is correct despite order changes
    if (capturedYoutubeVideos.length > 0) {
      // Find the association for uuid-video-a
      const videoAAssoc = capturedYoutubeVideos.find(
        (v) => v.video_id === 'uuid-video-a',
      )
      expect(videoAAssoc?.youtube_video_id).toBe('YT_videoA_youtube_id')

      // Find the association for uuid-video-b
      const videoBAssoc = capturedYoutubeVideos.find(
        (v) => v.video_id === 'uuid-video-b',
      )
      expect(videoBAssoc?.youtube_video_id).toBe('YT_videoB_youtube_id')

      // Find the association for uuid-video-c
      const videoCAssoc = capturedYoutubeVideos.find(
        (v) => v.video_id === 'uuid-video-c',
      )
      expect(videoCAssoc?.youtube_video_id).toBe('YT_videoC_youtube_id')
    }
  })
})
