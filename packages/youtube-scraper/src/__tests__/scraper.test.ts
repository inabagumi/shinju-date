import type { youtube_v3 as youtube } from '@googleapis/youtube'
import { range } from '@shinju-date/helpers'
import { YouTubeScraper } from '../scraper.js'
import type {
  YouTubeChannel,
  YouTubePlaylistItem,
  YouTubeVideo,
} from '../types/index.js'

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

  describe('getChannels', () => {
    it('should yield channels and call onChannelScraped callback', async () => {
      const mockChannels: YouTubeChannel[] = [
        {
          contentDetails: {
            relatedPlaylists: {
              uploads: 'UU123',
            },
          },
          id: 'UC123',
        },
        {
          contentDetails: {
            relatedPlaylists: {
              uploads: 'UU456',
            },
          },
          id: 'UC456',
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
      const channels: YouTubeChannel[] = []

      for await (const channel of scraper.getChannels({
        ids: ['UC123', 'UC456'],
        onChannelScraped,
      })) {
        channels.push(channel)
      }

      expect(channels).toHaveLength(2)
      expect(channels[0].id).toBe('UC123')
      expect(channels[1].id).toBe('UC456')
      expect(onChannelScraped).toHaveBeenCalledTimes(2)
      expect(onChannelScraped).toHaveBeenCalledWith(mockChannels[0])
      expect(onChannelScraped).toHaveBeenCalledWith(mockChannels[1])
    })

    it('should handle empty response', async () => {
      const mockClient = {
        channels: {
          list: vi.fn().mockResolvedValue({
            data: { items: [] },
          }),
        },
      } as unknown as youtube.Youtube

      const scraper = new YouTubeScraper({ youtubeClient: mockClient })
      const channels: YouTubeChannel[] = []

      for await (const channel of scraper.getChannels({
        ids: ['UC123'],
      })) {
        channels.push(channel)
      }

      expect(channels).toHaveLength(0)
    })

    it('should filter out invalid channels', async () => {
      const mockClient = {
        channels: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  contentDetails: {
                    relatedPlaylists: {
                      uploads: 'UU123',
                    },
                  },
                  id: 'UC123',
                },
                {
                  // Invalid: missing contentDetails
                  id: 'UC456',
                },
              ],
            },
          }),
        },
      } as unknown as youtube.Youtube

      const scraper = new YouTubeScraper({ youtubeClient: mockClient })
      const channels: YouTubeChannel[] = []

      for await (const channel of scraper.getChannels({
        ids: ['UC123', 'UC456'],
      })) {
        channels.push(channel)
      }

      expect(channels).toHaveLength(1)
      expect(channels[0].id).toBe('UC123')
    })
  })

  describe('getPlaylistItems', () => {
    it('should yield playlist items with callback', async () => {
      const mockItems: YouTubePlaylistItem[] = [
        { contentDetails: { videoId: 'video1' } },
        { contentDetails: { videoId: 'video2' } },
      ]

      const mockClient = {
        playlistItems: {
          list: vi.fn().mockResolvedValue({
            data: { items: mockItems },
          }),
        },
      } as unknown as youtube.Youtube

      const scraper = new YouTubeScraper({ youtubeClient: mockClient })
      const onPlaylistItemScraped = vi.fn()
      const items: YouTubePlaylistItem[] = []

      for await (const item of scraper.getPlaylistItems({
        onPlaylistItemScraped,
        playlistID: 'PL123',
      })) {
        items.push(item)
      }

      expect(items).toHaveLength(2)
      expect(items[0].contentDetails.videoId).toBe('video1')
      expect(items[1].contentDetails.videoId).toBe('video2')
      expect(onPlaylistItemScraped).toHaveBeenCalledTimes(2)
    })

    it('should paginate when all=true', async () => {
      const mockClient = {
        playlistItems: {
          list: vi
            .fn()
            .mockResolvedValueOnce({
              data: {
                items: [{ contentDetails: { videoId: 'video1' } }],
                nextPageToken: 'token123',
              },
            })
            .mockResolvedValueOnce({
              data: {
                items: [{ contentDetails: { videoId: 'video2' } }],
                nextPageToken: undefined,
              },
            }),
        },
      } as unknown as youtube.Youtube

      const scraper = new YouTubeScraper({ youtubeClient: mockClient })
      const items: YouTubePlaylistItem[] = []

      for await (const item of scraper.getPlaylistItems({
        all: true,
        playlistID: 'PL123',
      })) {
        items.push(item)
      }

      expect(items).toHaveLength(2)
      expect(mockClient.playlistItems.list).toHaveBeenCalledTimes(2)
    })

    it('should not paginate when all=false', async () => {
      const mockClient = {
        playlistItems: {
          list: vi.fn().mockResolvedValue({
            data: {
              items: [{ contentDetails: { videoId: 'video1' } }],
              nextPageToken: 'token123',
            },
          }),
        },
      } as unknown as youtube.Youtube

      const scraper = new YouTubeScraper({ youtubeClient: mockClient })
      const items: YouTubePlaylistItem[] = []

      for await (const item of scraper.getPlaylistItems({
        all: false,
        playlistID: 'PL123',
      })) {
        items.push(item)
      }

      expect(items).toHaveLength(1)
      expect(mockClient.playlistItems.list).toHaveBeenCalledTimes(1)
    })
  })

  describe('getVideos', () => {
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

      for await (const video of scraper.getVideos({
        ids: ['video1', 'video2'],
        onVideoScraped,
      })) {
        videos.push(video)
      }

      expect(videos).toHaveLength(2)
      expect(videos[0].id).toBe('video1')
      expect(videos[1].id).toBe('video2')
      expect(onVideoScraped).toHaveBeenCalledTimes(2)
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
      const videos: YouTubeVideo[] = []
      const videoIds = range(100).map((i) => `video${i}`)

      for await (const video of scraper.getVideos({ ids: videoIds })) {
        videos.push(video)
      }

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

      await scraper.scrapeChannels({
        channelIds: ['UC123'],
        onChannelScraped,
      })

      expect(onChannelScraped).toHaveBeenCalledTimes(1)
      expect(onChannelScraped).toHaveBeenCalledWith(mockChannels[0])
    })
  })

  describe('scrapePlaylistVideos', () => {
    it('should scrape playlist items and videos with callbacks', async () => {
      const mockPlaylistItems: YouTubePlaylistItem[] = [
        { contentDetails: { videoId: 'video1' } },
        { contentDetails: { videoId: 'video2' } },
      ]

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
        playlistItems: {
          list: vi.fn().mockResolvedValue({
            data: { items: mockPlaylistItems },
          }),
        },
        videos: {
          list: vi.fn().mockResolvedValue({
            data: { items: mockVideos },
          }),
        },
      } as unknown as youtube.Youtube

      const scraper = new YouTubeScraper({ youtubeClient: mockClient })
      const onVideoScraped = vi.fn()
      const onThumbnailScraped = vi.fn()

      await scraper.scrapePlaylistVideos({
        onThumbnailScraped,
        onVideoScraped,
        playlistId: 'PL123',
      })

      expect(onThumbnailScraped).toHaveBeenCalledTimes(2)
      expect(onVideoScraped).toHaveBeenCalledTimes(2)
    })
  })

  describe('checkVideos', () => {
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

      await scraper.checkVideos({
        onVideoChecked,
        videoIds: ['video1', 'video2', 'video3'],
      })

      expect(onVideoChecked).toHaveBeenCalledTimes(3)
      expect(onVideoChecked).toHaveBeenCalledWith({
        id: 'video1',
        isAvailable: true,
      })
      expect(onVideoChecked).toHaveBeenCalledWith({
        id: 'video2',
        isAvailable: false,
      })
      expect(onVideoChecked).toHaveBeenCalledWith({
        id: 'video3',
        isAvailable: true,
      })
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

      await scraper.checkVideos({
        onVideoChecked,
        videoIds,
      })

      expect(onVideoChecked).toHaveBeenCalledTimes(100)
      expect(mockClient.videos.list).toHaveBeenCalledTimes(2)
    })
  })

  describe('scrapeVideos', () => {
    it('should return all videos from playlist', async () => {
      const mockPlaylistItems: YouTubePlaylistItem[] = [
        { contentDetails: { videoId: 'video1' } },
      ]

      const mockVideos: YouTubeVideo[] = [
        {
          contentDetails: {},
          id: 'video1',
          snippet: { publishedAt: '2023-01-01T00:00:00Z' },
        },
      ]

      const mockClient = {
        playlistItems: {
          list: vi.fn().mockResolvedValue({
            data: { items: mockPlaylistItems },
          }),
        },
        videos: {
          list: vi.fn().mockResolvedValue({
            data: { items: mockVideos },
          }),
        },
      } as unknown as youtube.Youtube

      const scraper = new YouTubeScraper({ youtubeClient: mockClient })
      const videos = await scraper.scrapeVideos({
        playlistID: 'PL123',
        scrapeAll: false,
      })

      expect(videos).toHaveLength(1)
      expect(videos[0].id).toBe('video1')
    })
  })
})
