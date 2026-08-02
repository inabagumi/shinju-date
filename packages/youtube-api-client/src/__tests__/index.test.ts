import { describe, expect, it } from 'vitest'
import {
  parseYouTubeChannelIdentifier,
  YOUTUBE_DATA_API_MAX_RESULTS,
  YouTubeChannelSchema,
  YouTubeChannelSnippetSchema,
  YouTubePlaylistItemSchema,
  YouTubeVideoSchema,
} from '../index.js'

describe('YouTube API Client', () => {
  describe('constants', () => {
    it('should export YOUTUBE_DATA_API_MAX_RESULTS', () => {
      expect(YOUTUBE_DATA_API_MAX_RESULTS).toBe(50)
    })
  })

  describe('parseYouTubeChannelIdentifier', () => {
    const channelId = 'UCabcdefghijklmnopqrstuv'

    it('parses a bare channel ID', () => {
      expect(parseYouTubeChannelIdentifier(channelId)).toEqual({
        id: channelId,
        kind: 'id',
      })
    })

    it('parses a channel URL', () => {
      expect(
        parseYouTubeChannelIdentifier(
          `https://www.youtube.com/channel/${channelId}`,
        ),
      ).toEqual({ id: channelId, kind: 'id' })
      expect(
        parseYouTubeChannelIdentifier(
          `youtube.com/channel/${channelId}/videos`,
        ),
      ).toEqual({ id: channelId, kind: 'id' })
    })

    it('parses a handle with and without @', () => {
      expect(parseYouTubeChannelIdentifier('@example_handle')).toEqual({
        handle: 'example_handle',
        kind: 'handle',
      })
      expect(parseYouTubeChannelIdentifier('example_handle')).toEqual({
        handle: 'example_handle',
        kind: 'handle',
      })
    })

    it('parses a handle URL', () => {
      expect(
        parseYouTubeChannelIdentifier(
          'https://www.youtube.com/@example_handle',
        ),
      ).toEqual({ handle: 'example_handle', kind: 'handle' })
      expect(
        parseYouTubeChannelIdentifier(
          'https://youtube.com/@example_handle/videos',
        ),
      ).toEqual({ handle: 'example_handle', kind: 'handle' })
    })

    it('parses legacy /c/ and /user/ URLs as handles', () => {
      expect(
        parseYouTubeChannelIdentifier('https://www.youtube.com/c/ExampleName'),
      ).toEqual({ handle: 'ExampleName', kind: 'handle' })
      expect(
        parseYouTubeChannelIdentifier(
          'https://www.youtube.com/user/ExampleUser',
        ),
      ).toEqual({ handle: 'ExampleUser', kind: 'handle' })
    })

    it('returns null for empty or invalid input', () => {
      expect(parseYouTubeChannelIdentifier('')).toBeNull()
      expect(parseYouTubeChannelIdentifier('   ')).toBeNull()
      expect(parseYouTubeChannelIdentifier('ab')).toBeNull()
      expect(parseYouTubeChannelIdentifier('not a channel!!!')).toBeNull()
      expect(
        parseYouTubeChannelIdentifier('https://example.com/foo'),
      ).toBeNull()
    })
  })

  describe('YouTubeChannelSnippetSchema', () => {
    it('should validate a snippet with title only', () => {
      expect(() =>
        YouTubeChannelSnippetSchema.parse({ title: 'Test Channel' }),
      ).not.toThrow()
    })

    it('should validate a snippet with title and customUrl', () => {
      expect(() =>
        YouTubeChannelSnippetSchema.parse({
          customUrl: '@testchannel',
          title: 'Test Channel',
        }),
      ).not.toThrow()
    })

    it('should reject a snippet without title', () => {
      expect(() => YouTubeChannelSnippetSchema.parse({})).toThrow()
    })
  })

  describe('YouTubeChannelSchema', () => {
    it('should validate a valid channel', () => {
      const validChannel = {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UU12345',
          },
        },
        id: 'UC12345',
        snippet: {
          customUrl: '@testchannel',
          title: 'Test Channel',
        },
      }
      expect(() => YouTubeChannelSchema.parse(validChannel)).not.toThrow()
    })

    it('should validate a channel without customUrl', () => {
      const validChannel = {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UU12345',
          },
        },
        id: 'UC12345',
        snippet: {
          title: 'Test Channel',
        },
      }
      expect(() => YouTubeChannelSchema.parse(validChannel)).not.toThrow()
    })

    it('should reject a channel without id', () => {
      const invalidChannel = {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UU12345',
          },
        },
        snippet: {
          title: 'Test Channel',
        },
      }
      expect(() => YouTubeChannelSchema.parse(invalidChannel)).toThrow()
    })

    it('should reject a channel without uploads playlist', () => {
      const invalidChannel = {
        contentDetails: {
          relatedPlaylists: {},
        },
        id: 'UC12345',
        snippet: {
          title: 'Test Channel',
        },
      }
      expect(() => YouTubeChannelSchema.parse(invalidChannel)).toThrow()
    })

    it('should reject a channel without snippet title', () => {
      const invalidChannel = {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UU12345',
          },
        },
        id: 'UC12345',
        snippet: {},
      }
      expect(() => YouTubeChannelSchema.parse(invalidChannel)).toThrow()
    })

    it('should reject a channel without snippet', () => {
      const invalidChannel = {
        contentDetails: {
          relatedPlaylists: {
            uploads: 'UU12345',
          },
        },
        id: 'UC12345',
      }
      expect(() => YouTubeChannelSchema.parse(invalidChannel)).toThrow()
    })
  })

  describe('YouTubePlaylistItemSchema', () => {
    it('should validate a valid playlist item', () => {
      const validItem = {
        contentDetails: {
          videoId: 'dQw4w9WgXcQ',
        },
      }
      expect(() => YouTubePlaylistItemSchema.parse(validItem)).not.toThrow()
    })

    it('should reject a playlist item without videoId', () => {
      const invalidItem = {
        contentDetails: {},
      }
      expect(() => YouTubePlaylistItemSchema.parse(invalidItem)).toThrow()
    })
  })

  describe('YouTubeVideoSchema', () => {
    it('should validate a valid video', () => {
      const validVideo = {
        contentDetails: {},
        id: 'dQw4w9WgXcQ',
        snippet: {
          publishedAt: '2009-10-25T06:57:33Z',
        },
      }
      expect(() => YouTubeVideoSchema.parse(validVideo)).not.toThrow()
    })

    it('should reject a video without id', () => {
      const invalidVideo = {
        contentDetails: {},
        snippet: {
          publishedAt: '2009-10-25T06:57:33Z',
        },
      }
      expect(() => YouTubeVideoSchema.parse(invalidVideo)).toThrow()
    })

    it('should reject a video without publishedAt', () => {
      const invalidVideo = {
        contentDetails: {},
        id: 'dQw4w9WgXcQ',
        snippet: {},
      }
      expect(() => YouTubeVideoSchema.parse(invalidVideo)).toThrow()
    })
  })
})
