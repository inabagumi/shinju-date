import type { youtube_v3 as youtube } from '@googleapis/youtube'
import { Temporal } from 'temporal-polyfill'
import { describe, expect, it } from 'vitest'
import { getVideoStatus } from '../utils/get-video-status.js'

describe('getVideoStatus', () => {
  const currentDateTime = Temporal.Instant.from('2024-01-15T12:00:00Z')

  describe('PUBLISHED status', () => {
    it('should return PUBLISHED for regular video without liveStreamingDetails', () => {
      const video: youtube.Schema$Video = {
        id: 'video-1',
      }

      expect(getVideoStatus(video, currentDateTime)).toBe('PUBLISHED')
    })
  })

  describe('LIVE status', () => {
    it('should return LIVE when stream has actualStartTime but no actualEndTime', () => {
      const video: youtube.Schema$Video = {
        id: 'video-1',
        liveStreamingDetails: {
          actualStartTime: '2024-01-15T11:00:00Z',
        },
      }

      expect(getVideoStatus(video, currentDateTime)).toBe('LIVE')
    })

    it('should return LIVE even if scheduledStartTime exists', () => {
      const video: youtube.Schema$Video = {
        id: 'video-1',
        liveStreamingDetails: {
          actualStartTime: '2024-01-15T11:00:00Z',
          scheduledStartTime: '2024-01-15T10:00:00Z',
        },
      }

      expect(getVideoStatus(video, currentDateTime)).toBe('LIVE')
    })
  })

  describe('UPCOMING status', () => {
    it('should return UPCOMING when scheduledStartTime is in the future', () => {
      const video: youtube.Schema$Video = {
        id: 'video-1',
        liveStreamingDetails: {
          scheduledStartTime: '2024-01-15T15:00:00Z',
        },
      }

      expect(getVideoStatus(video, currentDateTime)).toBe('UPCOMING')
    })

    it('should return UPCOMING for premiere scheduled for future', () => {
      const video: youtube.Schema$Video = {
        id: 'video-1',
        liveStreamingDetails: {
          scheduledStartTime: '2024-01-16T10:00:00Z',
        },
      }

      expect(getVideoStatus(video, currentDateTime)).toBe('UPCOMING')
    })
  })

  describe('ENDED status', () => {
    it('should return ENDED when stream has both actualStartTime and actualEndTime', () => {
      const video: youtube.Schema$Video = {
        id: 'video-1',
        liveStreamingDetails: {
          actualEndTime: '2024-01-15T11:00:00Z',
          actualStartTime: '2024-01-15T10:00:00Z',
        },
      }

      expect(getVideoStatus(video, currentDateTime)).toBe('ENDED')
    })

    it('should return ENDED when scheduledStartTime has passed', () => {
      const video: youtube.Schema$Video = {
        id: 'video-1',
        liveStreamingDetails: {
          scheduledStartTime: '2024-01-15T10:00:00Z',
        },
      }

      expect(getVideoStatus(video, currentDateTime)).toBe('ENDED')
    })

    it('should return ENDED for completed premiere', () => {
      const video: youtube.Schema$Video = {
        id: 'video-1',
        liveStreamingDetails: {
          actualEndTime: '2024-01-14T10:05:00Z',
          actualStartTime: '2024-01-14T10:00:00Z',
          scheduledStartTime: '2024-01-14T10:00:00Z',
        },
      }

      expect(getVideoStatus(video, currentDateTime)).toBe('ENDED')
    })

    it('should return ENDED when only liveStreamingDetails exists (no specific times)', () => {
      const video: youtube.Schema$Video = {
        id: 'video-1',
        liveStreamingDetails: {},
      }

      expect(getVideoStatus(video, currentDateTime)).toBe('ENDED')
    })
  })

  describe('edge cases', () => {
    it('should use current time when currentDateTime is not provided', () => {
      const video: youtube.Schema$Video = {
        id: 'video-1',
      }

      // Should not throw error
      const status = getVideoStatus(video)
      expect(status).toBe('PUBLISHED')
    })

    it('should handle scheduledStartTime equal to currentDateTime as ENDED', () => {
      const video: youtube.Schema$Video = {
        id: 'video-1',
        liveStreamingDetails: {
          scheduledStartTime: '2024-01-15T12:00:00Z',
        },
      }

      expect(getVideoStatus(video, currentDateTime)).toBe('ENDED')
    })
  })
})
