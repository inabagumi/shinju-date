import type { youtube_v3 as youtube } from '@googleapis/youtube'
import {
  isValidChannel,
  isValidPlaylistItem,
  isValidVideo,
  YOUTUBE_DATA_API_MAX_RESULTS,
} from '../utils/helpers.js'

describe('YOUTUBE_DATA_API_MAX_RESULTS', () => {
  it('should be 50', () => {
    expect(YOUTUBE_DATA_API_MAX_RESULTS).toBe(50)
  })
})

describe('isValidChannel', () => {
  it('should return true for valid channel', () => {
    const channel: youtube.Schema$Channel = {
      contentDetails: {
        relatedPlaylists: {
          uploads: 'UU1234567890',
        },
      },
      id: 'UC1234567890',
      snippet: {
        title: 'Test Channel',
      },
    }

    expect(isValidChannel(channel)).toBe(true)
  })

  it('should return false when id is missing', () => {
    const channel: youtube.Schema$Channel = {
      contentDetails: {
        relatedPlaylists: {
          uploads: 'UU1234567890',
        },
      },
      snippet: {
        title: 'Test Channel',
      },
    }

    expect(isValidChannel(channel)).toBe(false)
  })

  it('should return false when contentDetails is missing', () => {
    const channel: youtube.Schema$Channel = {
      id: 'UC1234567890',
      snippet: {
        title: 'Test Channel',
      },
    }

    expect(isValidChannel(channel)).toBe(false)
  })

  it('should return false when relatedPlaylists is missing', () => {
    const channel: youtube.Schema$Channel = {
      contentDetails: {},
      id: 'UC1234567890',
      snippet: {
        title: 'Test Channel',
      },
    }

    expect(isValidChannel(channel)).toBe(false)
  })

  it('should return false when uploads playlist is missing', () => {
    const channel: youtube.Schema$Channel = {
      contentDetails: {
        relatedPlaylists: {},
      },
      id: 'UC1234567890',
      snippet: {
        title: 'Test Channel',
      },
    }

    expect(isValidChannel(channel)).toBe(false)
  })

  it('should return false when snippet is missing', () => {
    const channel: youtube.Schema$Channel = {
      contentDetails: {
        relatedPlaylists: {
          uploads: 'UU1234567890',
        },
      },
      id: 'UC1234567890',
    }

    expect(isValidChannel(channel)).toBe(false)
  })

  it('should return false when snippet title is missing', () => {
    const channel: youtube.Schema$Channel = {
      contentDetails: {
        relatedPlaylists: {
          uploads: 'UU1234567890',
        },
      },
      id: 'UC1234567890',
      snippet: {},
    }

    expect(isValidChannel(channel)).toBe(false)
  })
})

describe('isValidPlaylistItem', () => {
  it('should return true for valid playlist item', () => {
    const item: youtube.Schema$PlaylistItem = {
      contentDetails: {
        videoId: 'dQw4w9WgXcQ',
      },
    }

    expect(isValidPlaylistItem(item)).toBe(true)
  })

  it('should return false when contentDetails is missing', () => {
    const item: youtube.Schema$PlaylistItem = {}

    expect(isValidPlaylistItem(item)).toBe(false)
  })

  it('should return false when videoId is missing', () => {
    const item: youtube.Schema$PlaylistItem = {
      contentDetails: {},
    }

    expect(isValidPlaylistItem(item)).toBe(false)
  })
})

describe('isValidVideo', () => {
  it('should return true for valid video', () => {
    const video: youtube.Schema$Video = {
      contentDetails: {},
      id: 'dQw4w9WgXcQ',
      snippet: {
        publishedAt: '2023-01-01T00:00:00Z',
      },
    }

    expect(isValidVideo(video)).toBe(true)
  })

  it('should return false when id is missing', () => {
    const video: youtube.Schema$Video = {
      contentDetails: {},
      snippet: {
        publishedAt: '2023-01-01T00:00:00Z',
      },
    }

    expect(isValidVideo(video)).toBe(false)
  })

  it('should return false when snippet is missing', () => {
    const video: youtube.Schema$Video = {
      contentDetails: {},
      id: 'dQw4w9WgXcQ',
    }

    expect(isValidVideo(video)).toBe(false)
  })

  it('should return false when publishedAt is missing', () => {
    const video: youtube.Schema$Video = {
      contentDetails: {},
      id: 'dQw4w9WgXcQ',
      snippet: {},
    }

    expect(isValidVideo(video)).toBe(false)
  })

  it('should return false when contentDetails is missing', () => {
    const video: youtube.Schema$Video = {
      id: 'dQw4w9WgXcQ',
      snippet: {
        publishedAt: '2023-01-01T00:00:00Z',
      },
    }

    expect(isValidVideo(video)).toBe(false)
  })
})
