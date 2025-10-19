import { describe, expect, it } from 'vitest'
import {
  YOUTUBE_DATA_API_MAX_RESULTS,
  YouTubeChannelSchema,
  YouTubePlaylistItemSchema,
  YouTubeVideoSchema,
} from '../index.js'

describe('YouTube API Client', () => {
  describe('constants', () => {
    it('should export YOUTUBE_DATA_API_MAX_RESULTS', () => {
      expect(YOUTUBE_DATA_API_MAX_RESULTS).toBe(50)
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
      }
      expect(() => YouTubeChannelSchema.parse(invalidChannel)).toThrow()
    })

    it('should reject a channel without uploads playlist', () => {
      const invalidChannel = {
        contentDetails: {
          relatedPlaylists: {},
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
