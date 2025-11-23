import type { youtube_v3 as youtube } from '@googleapis/youtube'
import { range } from '@shinju-date/helpers'
import { describe, expect, it, vi } from 'vitest'
import { YouTubeScraper } from '../scraper.js'
import type { YouTubeChannel, YouTubeVideo } from '../types/index.js'

describe('YouTubeScraper', () => {
  describe('constructor', () => {
    it('should throw error when youtubeClient is not provided', () => {
      expect(() => {
        // biome-ignore lint/suspicious/noExplicitAny: Testing error handling for invalid input
        new YouTubeScraper({ youtubeClient: undefined as any })
      }).toThrow('youtubeClient is required')
    })

    it('should create instance with valid youtubeClient', () => {
      const mockClient = {
        channels: { list: vi.fn() },
        playlistItems: { list: vi.fn() },
        videos: { list: vi.fn() },
      } as unknown as youtube.Youtube

      const scraper = new YouTubeScraper({ youtubeClient: mockClient })

      expect(scraper).toBeInstanceOf(YouTubeScraper)
    })
  })

  describe('scrapeVideos', () => {
    it('should yield videos with callback', async () => {
      const mockVideos: YouTubeVideo[] = [
        {
          contentDetails: {},
          id: 'video1',
          snippet: { publishedAt: '2023-01-01T00:00:00Z' },
        },
        {
          contentDetails: {},
          id: 'video2',
          snippet: { publishedAt: '2023-01-02T00:00:00Z' },
        },
      ]

      const mockClient = {
        videos: {
          list: vi.fn().mockResolvedValue({
            data: { items: mockVideos },
          }),
        },
      } as unknown as youtube.Youtube

      const scraper = new YouTubeScraper({ youtubeClient: mockClient })
      const onVideoScraped = vi.fn()
      const videos: YouTubeVideo[] = []

      await scraper.scrapeVideos(
        { ids: ['video1', 'video2'] },
        (videoBatch) => {
          videos.push(...videoBatch)
          onVideoScraped(videoBatch)
        },
      )

      expect(videos).toHaveLength(2)
      expect(videos[0]?.id).toBe('video1')
      expect(videos[1]?.id).toBe('video2')
      expect(onVideoScraped).toHaveBeenCalledTimes(1)
      expect(onVideoScraped).toHaveBeenCalledWith(mockVideos)
    })

    it('should batch requests for large video arrays', async () => {
      const mockVideos: YouTubeVideo[] = range(100).map((i) => ({
        contentDetails: {},
        id: `video${i}`,
        snippet: { publishedAt: '2023-01-01T00:00:00Z' },
      }))

      const mockClient = {
        videos: {
          list: vi
            .fn()
            .mockResolvedValueOnce({
              data: { items: mockVideos.slice(0, 50) },
            })
            .mockResolvedValueOnce({
              data: { items: mockVideos.slice(50, 100) },
            }),
        },
      } as unknown as youtube.Youtube

      const scraper = new YouTubeScraper({ youtubeClient: mockClient })
      const videoIds = range(100).map((i) => `video${i}`)
      const videos: YouTubeVideo[] = []

      await scraper.scrapeVideos({ ids: videoIds }, (videoBatch) => {
        videos.push(...videoBatch)
      })

      expect(videos).toHaveLength(100)
      expect(mockClient.videos.list).toHaveBeenCalledTimes(2)
    })
  })

  describe('scrapeChannels', () => {
    it('should call onChannelScraped for each channel', async () => {
      const mockChannels: YouTubeChannel[] = [
        {
          contentDetails: {
            relatedPlaylists: {
              uploads: 'UU123',
            },
          },
          id: 'UC123',
          snippet: {
            title: 'Test Channel',
          },
        },
      ]

      const mockClient = {
        channels: {
          list: vi.fn().mockResolvedValue({
            data: { items: mockChannels },
          }),
        },
      } as unknown as youtube.Youtube

      const scraper = new YouTubeScraper({ youtubeClient: mockClient })
      const onChannelScraped = vi.fn()

      await scraper.scrapeChannels({ channelIds: ['UC123'] }, onChannelScraped)

      expect(onChannelScraped).toHaveBeenCalledTimes(1)
      expect(onChannelScraped).toHaveBeenCalledWith(mockChannels)
    })
  })

  describe('scrapeVideosAvailability', () => {
    it('should check video availability', async () => {
      const mockClient = {
        videos: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [{ id: 'video1' }, { id: 'video3' }],
            },
          }),
        },
      } as unknown as youtube.Youtube

      const scraper = new YouTubeScraper({ youtubeClient: mockClient })
      const onVideoChecked = vi.fn()

      await scraper.scrapeVideosAvailability(
        { videoIds: ['video1', 'video2', 'video3'] },
        onVideoChecked,
      )

      expect(onVideoChecked).toHaveBeenCalledTimes(1)
      expect(onVideoChecked).toHaveBeenCalledWith([
        {
          id: 'video1',
          isAvailable: true,
        },
        {
          id: 'video2',
          isAvailable: false,
        },
        {
          id: 'video3',
          isAvailable: true,
        },
      ])
    })

    it('should batch check large video arrays', async () => {
      const videoIds = range(100).map((i) => `video${i}`)

      const mockClient = {
        videos: {
          list: vi
            .fn()
            .mockResolvedValueOnce({
              data: {
                items: videoIds.slice(0, 50).map((id) => ({ id })),
              },
            })
            .mockResolvedValueOnce({
              data: {
                items: videoIds.slice(50, 100).map((id) => ({ id })),
              },
            }),
        },
      } as unknown as youtube.Youtube

      const scraper = new YouTubeScraper({ youtubeClient: mockClient })
      const onVideoChecked = vi.fn()

      await scraper.scrapeVideosAvailability({ videoIds }, onVideoChecked)

      expect(onVideoChecked).toHaveBeenCalledTimes(2)
      expect(mockClient.videos.list).toHaveBeenCalledTimes(2)
    })
  })
})
