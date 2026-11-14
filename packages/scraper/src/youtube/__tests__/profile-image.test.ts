import { beforeAll, describe, expect, it } from 'vitest'
import { TEST_NOW } from '../../internal/testing/context.js'
import {
  createImage,
  mockStorage,
  serveImage,
} from '../../internal/testing/profile-images.js'
import { setupSupabase } from '../../internal/testing/supabase.js'
import {
  type SavedYouTubeChannelIcon,
  selectYouTubeChannelIconUrl,
  syncYouTubeChannelIcon,
} from '../profile-image.js'

const supabase = setupSupabase()

/** The sizes the YouTube Data API returns for a channel. */
const thumbnails = {
  default: {
    height: 88,
    url: 'https://yt3.ggpht.com/icon=s88-c-k-c0x00ffffff-no-rj',
    width: 88,
  },
  high: {
    height: 800,
    url: 'https://yt3.ggpht.com/icon=s800-c-k-c0x00ffffff-no-rj',
    width: 800,
  },
  medium: {
    height: 240,
    url: 'https://yt3.ggpht.com/icon=s240-c-k-c0x00ffffff-no-rj',
    width: 240,
  },
}

describe('selectYouTubeChannelIconUrl', () => {
  it('picks the smallest square icon that is large enough', () => {
    expect(selectYouTubeChannelIconUrl(thumbnails)).toBe(thumbnails.high.url)
    expect(
      selectYouTubeChannelIconUrl({
        ...thumbnails,
        standard: {
          height: 300,
          url: 'https://yt3.ggpht.com/icon=s300',
          width: 300,
        },
      }),
    ).toBe('https://yt3.ggpht.com/icon=s300')
  })

  it('falls back to the largest square icon', () => {
    expect(
      selectYouTubeChannelIconUrl({
        default: thumbnails.default,
        medium: thumbnails.medium,
      }),
    ).toBe(thumbnails.medium.url)
  })

  it('prefers square icons over larger ones that are not square', () => {
    expect(
      selectYouTubeChannelIconUrl({
        default: thumbnails.default,
        maxres: {
          height: 720,
          url: 'https://yt3.ggpht.com/banner',
          width: 1280,
        },
      }),
    ).toBe(thumbnails.default.url)
  })

  it('uses the largest icon when no size is known', () => {
    expect(
      selectYouTubeChannelIconUrl({
        default: { url: 'https://yt3.ggpht.com/small' },
        high: { url: 'https://yt3.ggpht.com/large' },
      }),
    ).toBe('https://yt3.ggpht.com/large')
  })

  it('ignores URLs that are not HTTPS', () => {
    expect(
      selectYouTubeChannelIconUrl({
        default: thumbnails.default,
        high: { ...thumbnails.high, url: 'http://yt3.ggpht.com/icon' },
      }),
    ).toBe(thumbnails.default.url)
    expect(
      selectYouTubeChannelIconUrl({ high: { url: 'not a url' } }),
    ).toBeNull()
  })

  it('returns null when the channel has no icon', () => {
    expect(selectYouTubeChannelIconUrl(undefined)).toBeNull()
    expect(selectYouTubeChannelIconUrl({})).toBeNull()
    expect(selectYouTubeChannelIconUrl({ default: { url: '' } })).toBeNull()
  })
})

describe('syncYouTubeChannelIcon', () => {
  const saved: SavedYouTubeChannelIcon = {
    id: 'channel-row-1',
    profile_images: null,
    youtube_channel_id: 'UCaaa',
  }

  let image: Buffer

  beforeAll(async () => {
    image = await createImage(800, 800)
  })

  function respondWithChannel(): void {
    supabase.respond(({ method, table }) =>
      method === 'PATCH' && table === 'youtube_channels'
        ? [{ id: saved.id }]
        : [],
    )
  }

  it('stores the icon of a channel that has none yet', async () => {
    const requests = serveImage(supabase, thumbnails.high.url, { body: image })
    const storage = mockStorage(supabase)
    respondWithChannel()

    await expect(
      syncYouTubeChannelIcon({
        channel: { snippet: { thumbnails, title: 'Alice' } },
        now: TEST_NOW,
        saved,
        supabaseClient: supabase.supabaseClient,
      }),
    ).resolves.toBe('created')

    expect(requests).toEqual([{ ifNoneMatch: null, url: thumbnails.high.url }])
    expect(storage.uploads[0]?.path).toMatch(/^youtube\/UCaaa\/[^/]+\.webp$/)
    expect(supabase.written('POST', 'profile_images')[0]?.body).toMatchObject({
      height: 256,
      source_url: thumbnails.high.url,
      width: 256,
    })
    expect(supabase.written('PATCH', 'youtube_channels')[0]?.query).toEqual({
      id: 'eq.channel-row-1',
      select: 'id',
    })
  })

  it('asks YouTube whether a saved icon changed', async () => {
    const requests = serveImage(supabase, thumbnails.high.url, { body: image })
    const storage = mockStorage(supabase)
    respondWithChannel()

    await expect(
      syncYouTubeChannelIcon({
        channel: { snippet: { thumbnails, title: 'Alice' } },
        now: TEST_NOW,
        saved: {
          ...saved,
          profile_images: {
            etag: '"etag-1"',
            id: 'image-1',
            path: 'youtube/UCaaa/old.webp',
            source_url: thumbnails.high.url,
          },
        },
        supabaseClient: supabase.supabaseClient,
      }),
    ).resolves.toBe('unchanged')

    expect(requests).toEqual([
      { ifNoneMatch: '"etag-1"', url: thumbnails.high.url },
    ])
    expect(storage.uploads).toHaveLength(0)
    expect(supabase.requests).toHaveLength(0)
  })

  it('replaces the icon when YouTube serves it from a new URL', async () => {
    serveImage(supabase, thumbnails.high.url, { body: image })
    const storage = mockStorage(supabase)
    respondWithChannel()

    await expect(
      syncYouTubeChannelIcon({
        channel: { snippet: { thumbnails, title: 'Alice' } },
        now: TEST_NOW,
        saved: {
          ...saved,
          profile_images: {
            etag: '"etag-1"',
            id: 'image-1',
            path: 'youtube/UCaaa/old.webp',
            source_url: 'https://yt3.ggpht.com/old=s800-c-k-c0x00ffffff-no-rj',
          },
        },
        supabaseClient: supabase.supabaseClient,
      }),
    ).resolves.toBe('replaced')

    expect(storage.uploads).toHaveLength(1)
    expect(supabase.written('DELETE', 'profile_images')[0]?.query).toEqual({
      id: 'eq.image-1',
    })
    expect(storage.removed).toEqual([['youtube/UCaaa/old.webp']])
  })

  it('rejects when the icon cannot be downloaded', async () => {
    serveImage(supabase, thumbnails.high.url, {
      body: Buffer.from('<html></html>'),
      contentType: 'text/html',
    })
    const storage = mockStorage(supabase)
    respondWithChannel()

    await expect(
      syncYouTubeChannelIcon({
        channel: { snippet: { thumbnails, title: 'Alice' } },
        now: TEST_NOW,
        saved,
        supabaseClient: supabase.supabaseClient,
      }),
    ).rejects.toThrow('Expected an image')

    expect(storage.uploads).toHaveLength(0)
    expect(supabase.requests).toHaveLength(0)
  })
})
