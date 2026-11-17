import { describe, expect, it } from 'vitest'
import { createFakeTwitchFetcher } from '../../internal/testing/fetcher.js'
import {
  createSavedArchive,
  createVideo,
} from '../../internal/testing/twitch.js'
import { createTwitchPlatform } from '../platform.js'

const now = Temporal.Instant.from('2024-05-01T12:00:00Z')

describe('createTwitchPlatform', () => {
  it('identifies a saved video by its Twitch video ID', () => {
    const { fetcher } = createFakeTwitchFetcher()
    const platform = createTwitchPlatform(fetcher)

    expect(platform.platform).toBe('twitch')
    expect(
      platform.getPlatformVideoId(
        createSavedArchive({ twitch_video: { twitch_video_id: 'vod-1' } }),
      ),
    ).toBe('vod-1')
  })

  it('looks up videos with one call and reports the missing ones', async () => {
    const video = createVideo({ id: 'vod-1' })
    const { fetcher, getClips, getVideos } = createFakeTwitchFetcher({
      missingVideoIds: ['vod-gone'],
      videos: [video],
    })

    const result = await createTwitchPlatform(fetcher).lookUp([
      'vod-1',
      'vod-gone',
    ])

    expect(getVideos).toHaveBeenCalledExactlyOnceWith(['vod-1', 'vod-gone'])
    expect(getClips).not.toHaveBeenCalled()
    expect(result).toEqual({
      fetchedById: new Map([['vod-1', video]]),
      missingIds: ['vod-gone'],
    })
  })

  it('maps a video to its fields, as a standard video', () => {
    const { fetcher } = createFakeTwitchFetcher()

    expect(createTwitchPlatform(fetcher).toFields(createVideo(), now)).toEqual({
      duration: 'PT2H',
      published_at: '2024-05-01T09:00:00Z',
      status: 'ENDED',
      title: 'Archive',
      video_kind: 'standard',
    })
  })
})
