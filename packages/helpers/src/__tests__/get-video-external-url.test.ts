import { getVideoExternalUrl } from '../get-video-external-url.js'

describe('getVideoExternalUrl', () => {
  describe('youtube', () => {
    it('returns a watch URL for a YouTube video id', () => {
      expect(
        getVideoExternalUrl({
          platform: 'youtube',
          youtubeVideoId: 'dQw4w9WgXcQ',
        }),
      ).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    })

    it('returns null when youtube video id is missing', () => {
      expect(
        getVideoExternalUrl({
          platform: 'youtube',
        }),
      ).toBeNull()
    })

    it('encodes special characters in the video id', () => {
      expect(
        getVideoExternalUrl({
          platform: 'youtube',
          youtubeVideoId: 'a b',
        }),
      ).toBe('https://www.youtube.com/watch?v=a%20b')
    })
  })

  describe('twitch', () => {
    it('returns the channel top URL when status is LIVE', () => {
      expect(
        getVideoExternalUrl({
          platform: 'twitch',
          status: 'LIVE',
          twitchLoginName: 'example_user',
          twitchVideoId: '123456789',
          twitchVideoType: 'archive',
        }),
      ).toBe('https://www.twitch.tv/example_user')
    })

    it('returns the channel top URL when status is UPCOMING', () => {
      expect(
        getVideoExternalUrl({
          platform: 'twitch',
          status: 'UPCOMING',
          twitchLoginName: 'example_user',
          twitchVideoId: '123456789',
        }),
      ).toBe('https://www.twitch.tv/example_user')
    })

    it('returns a VOD URL for ended archive videos', () => {
      expect(
        getVideoExternalUrl({
          platform: 'twitch',
          status: 'ENDED',
          twitchLoginName: 'example_user',
          twitchVideoId: '123456789',
          twitchVideoType: 'archive',
        }),
      ).toBe('https://www.twitch.tv/videos/123456789')
    })

    it('returns the channel top URL for synthetic live placeholders', () => {
      expect(
        getVideoExternalUrl({
          platform: 'twitch',
          status: 'ENDED',
          twitchLoginName: 'example_user',
          twitchVideoId: 'live:stream-99',
        }),
      ).toBe('https://www.twitch.tv/example_user')
    })

    it('returns a clips URL for clip type', () => {
      expect(
        getVideoExternalUrl({
          platform: 'twitch',
          status: 'PUBLISHED',
          twitchLoginName: 'example_user',
          twitchVideoId: 'FunnyClipSlug',
          twitchVideoType: 'clip',
        }),
      ).toBe('https://clips.twitch.tv/FunnyClipSlug')
    })

    it('falls back to channel URL when only login is available', () => {
      expect(
        getVideoExternalUrl({
          platform: 'twitch',
          status: 'ENDED',
          twitchLoginName: 'example_user',
        }),
      ).toBe('https://www.twitch.tv/example_user')
    })

    it('falls back to VOD URL for LIVE without login name', () => {
      expect(
        getVideoExternalUrl({
          platform: 'twitch',
          status: 'LIVE',
          twitchVideoId: '123456789',
        }),
      ).toBe('https://www.twitch.tv/videos/123456789')
    })

    it('returns null when no twitch identifiers are available', () => {
      expect(
        getVideoExternalUrl({
          platform: 'twitch',
          status: 'ENDED',
        }),
      ).toBeNull()
    })
  })
})
