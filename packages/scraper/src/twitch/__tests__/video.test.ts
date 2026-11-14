import { describe, expect, it } from 'vitest'
import type { TwitchStream, TwitchVideo } from '../types.js'
import {
  getThumbnailSource,
  getVideoChanges,
  toLiveFields,
  toVideoFields,
} from '../video.js'

const video = {
  created_at: '2024-05-01T09:00:00Z',
  duration: 'PT1H2M3S',
  published_at: '2024-05-01T09:00:05Z',
  title: 'Archive',
  type: 'archive',
} as TwitchVideo

describe('toVideoFields', () => {
  it('maps a Helix video', () => {
    expect(toVideoFields(video)).toEqual({
      duration: 'PT1H2M3S',
      published_at: '2024-05-01T09:00:05Z',
      status: 'ENDED',
      title: 'Archive',
    })
  })

  it('falls back to the creation time', () => {
    expect(toVideoFields({ ...video, published_at: '' }).published_at).toBe(
      '2024-05-01T09:00:00Z',
    )
  })
})

describe('toLiveFields', () => {
  it('maps a stream that is on air', () => {
    const stream = {
      started_at: '2024-05-01T09:00:00.123Z',
      title: 'Live now',
    } as TwitchStream

    expect(toLiveFields(stream)).toEqual({
      duration: 'P0D',
      published_at: '2024-05-01T09:00:00Z',
      status: 'LIVE',
      title: 'Live now',
    })
  })
})

describe('getVideoChanges', () => {
  const saved = toVideoFields(video)

  it('returns null when nothing changed', () => {
    expect(
      getVideoChanges(
        { ...saved, published_at: '2024-05-01T09:00:05+00:00' },
        saved,
      ),
    ).toBeNull()
  })

  it('returns only the columns that changed', () => {
    expect(
      getVideoChanges(saved, { ...saved, duration: 'PT2H', title: 'Renamed' }),
    ).toEqual({ duration: 'PT2H', title: 'Renamed' })
  })
})

describe('getThumbnailSource', () => {
  it('resolves the size placeholders of a template URL', () => {
    expect(
      getThumbnailSource('https://cdn.test/thumb-%{width}x%{height}.jpg'),
    ).toEqual({
      height: 720,
      url: 'https://cdn.test/thumb-1280x720.jpg',
      width: 1280,
    })
  })

  it('returns null while the broadcast has no thumbnail yet', () => {
    expect(getThumbnailSource('')).toBeNull()
  })

  it('returns null for the placeholder of a VOD that is still processing', () => {
    expect(
      getThumbnailSource(
        'https://vod-secure.twitch.tv/_404/404_processing_%{width}x%{height}.png',
      ),
    ).toBeNull()
  })
})
