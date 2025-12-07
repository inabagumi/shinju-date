import type { youtube_v3 as youtube } from '@googleapis/youtube'
import { describe, expect, it } from 'vitest'
import { getVideoKind } from '../utils/get-video-kind.js'

describe('getVideoKind', () => {
  describe('short videos', () => {
    it('should classify video as short when duration is exactly 180 seconds', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT180S',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video)).toBe('short')
    })

    it('should classify video as short when duration is 3 minutes', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT3M',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video)).toBe('short')
    })

    it('should classify video as short when duration is 2 minutes 30 seconds', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT2M30S',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video)).toBe('short')
    })

    it('should classify video as short when duration is 60 seconds', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT60S',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video)).toBe('short')
    })

    it('should classify video as short when duration is 30 seconds', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT30S',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video)).toBe('short')
    })

    it('should classify very short video (5 seconds) as short', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT5S',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video)).toBe('short')
    })
  })

  describe('standard videos', () => {
    it('should classify video as standard when duration is 181 seconds', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT181S',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video)).toBe('standard')
    })

    it('should classify video as standard when duration is 3 minutes 1 second', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT3M1S',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video)).toBe('standard')
    })

    it('should classify video as standard when duration is 10 minutes', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT10M',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video)).toBe('standard')
    })

    it('should classify video as standard when duration is 1 hour', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT1H',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video)).toBe('standard')
    })

    it('should classify video as standard when duration is 2 hours 30 minutes', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'PT2H30M',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video)).toBe('standard')
    })

    it('should classify video as standard when no contentDetails exist', () => {
      const video: youtube.Schema$Video = {
        id: 'video-1',
      }

      expect(getVideoKind(video)).toBe('standard')
    })

    it('should classify video as standard when duration is missing', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {},
        id: 'video-1',
      }

      expect(getVideoKind(video)).toBe('standard')
    })
  })

  describe('edge cases', () => {
    it('should handle malformed duration gracefully', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'INVALID',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video)).toBe('standard')
    })

    it('should handle P0D duration as standard', () => {
      const video: youtube.Schema$Video = {
        contentDetails: {
          duration: 'P0D',
        },
        id: 'video-1',
      }

      expect(getVideoKind(video)).toBe('standard')
    })
  })
})
