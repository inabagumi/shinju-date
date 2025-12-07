import type { youtube_v3 as youtube } from '@googleapis/youtube'
import { Temporal } from 'temporal-polyfill'
import { describe, expect, it } from 'vitest'
import { getVideoKind } from '../utils/get-video-kind.js'

describe('getVideoKind', () => {
  const currentDateTime = Temporal.Instant.from('2024-01-15T12:00:00Z')

  describe('short videos', () => {
    it('should classify video as short when duration is exactly 60 seconds', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT60S',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video, currentDateTime)).toBe('short')
    })

    it('should classify video as short when duration is 59 seconds', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT59S',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video, currentDateTime)).toBe('short')
    })

    it('should classify video as short when duration is 30 seconds', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT30S',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video, currentDateTime)).toBe('short')
    })

    it('should classify video as short when duration is 1 minute (60 seconds)', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT1M',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video, currentDateTime)).toBe('short')
    })

    it('should classify very short video (5 seconds) as short', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT5S',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video, currentDateTime)).toBe('short')
    })
  })

  describe('standard videos', () => {
    it('should classify video as standard when duration is 61 seconds', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT61S',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video, currentDateTime)).toBe('standard')
    })

    it('should classify video as standard when duration is 1 minute 1 second', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT1M1S',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video, currentDateTime)).toBe('standard')
    })

    it('should classify video as standard when duration is 10 minutes', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT10M',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video, currentDateTime)).toBe('standard')
    })

    it('should classify video as standard when duration is 1 hour', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT1H',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video, currentDateTime)).toBe('standard')
    })

    it('should classify video as standard when duration is 2 hours 30 minutes', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT2H30M',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video, currentDateTime)).toBe('standard')
    })

    it('should classify video as standard when no contentDetails exist', () => {
      const video: youtube.Schema$Video = {
        id: 'video-1',
      }

      expect(getVideoKind(video, currentDateTime)).toBe('standard')
    })

    it('should classify video as standard when duration is missing', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {},
        id: 'video-1',
      }

      expect(getVideoKind(video, currentDateTime)).toBe('standard')
    })

    it('should classify ended live stream as standard', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT1H30M',
        },
        id: 'video-1',
        liveStreamingDetails: {
          actualEndTime: '2024-01-15T11:00:00Z',
          actualStartTime: '2024-01-15T10:00:00Z',
        },
      }

      expect(getVideoKind(video, currentDateTime)).toBe('standard')
    })
  })

  describe('live_stream videos', () => {
    it('should classify as live_stream when stream is currently live', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT0S', // Duration not meaningful for live streams
        },
        id: 'video-1',
        liveStreamingDetails: {
          actualStartTime: '2024-01-15T11:00:00Z',
        },
      }

      expect(getVideoKind(video, currentDateTime)).toBe('live_stream')
    })

    it('should prioritize live_stream over short duration', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT30S', // Short duration
        },
        id: 'video-1',
        liveStreamingDetails: {
          actualStartTime: '2024-01-15T11:00:00Z', // But currently live
        },
      }

      expect(getVideoKind(video, currentDateTime)).toBe('live_stream')
    })
  })

  describe('premiere videos', () => {
    it('should classify as premiere when scheduled for future', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT10M',
        },
        id: 'video-1',
        liveStreamingDetails: {
          scheduledStartTime: '2024-01-15T15:00:00Z',
        },
      }

      expect(getVideoKind(video, currentDateTime)).toBe('premiere')
    })

    it('should prioritize premiere over short duration', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT45S', // Short duration
        },
        id: 'video-1',
        liveStreamingDetails: {
          scheduledStartTime: '2024-01-15T15:00:00Z', // But scheduled premiere
        },
      }

      expect(getVideoKind(video, currentDateTime)).toBe('premiere')
    })

    it('should classify as premiere for upcoming live stream', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT0S',
        },
        id: 'video-1',
        liveStreamingDetails: {
          scheduledStartTime: '2024-01-16T10:00:00Z',
        },
      }

      expect(getVideoKind(video, currentDateTime)).toBe('premiere')
    })
  })

  describe('edge cases', () => {
    it('should use current time when currentDateTime is not provided', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT10M',
        },
        id: 'video-1',
      }

      // Should not throw error
      const kind = getVideoKind(video)
      expect(kind).toBe('standard')
    })

    it('should handle malformed duration gracefully', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'INVALID',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video, currentDateTime)).toBe('standard')
    })

    it('should handle P0D duration as standard', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'P0D',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video, currentDateTime)).toBe('standard')
    })

    it('should handle empty liveStreamingDetails as standard', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT10M',
        },
        id: 'video-1',
        liveStreamingDetails: {},
      }

      expect(getVideoKind(video, currentDateTime)).toBe('standard')
    })

    it('should handle scheduledStartTime in the past as standard', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT10M',
        },
        id: 'video-1',
        liveStreamingDetails: {
          scheduledStartTime: '2024-01-15T10:00:00Z', // In the past
        },
      }

      expect(getVideoKind(video, currentDateTime)).toBe('standard')
    })
  })
})
