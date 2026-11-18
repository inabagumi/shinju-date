import type { youtube_v3 as youtube } from '@googleapis/youtube'
import { describe, expect, it, vi } from 'vitest'
import {
  getPlaylistItems,
  getPlaylistItemsPage,
  isFilteredYouTubePlaylistItem,
} from './playlist-items.js'

describe('isFilteredYouTubePlaylistItem', () => {
  it('accepts a playlist item with a video ID', () => {
    expect(
      isFilteredYouTubePlaylistItem({
        contentDetails: { videoId: 'dQw4w9WgXcQ' },
      }),
    ).toBe(true)
  })

  it('rejects a playlist item without a video ID', () => {
    expect(isFilteredYouTubePlaylistItem({ contentDetails: {} })).toBe(false)
    expect(
      isFilteredYouTubePlaylistItem({ contentDetails: { videoId: null } }),
    ).toBe(false)
    expect(isFilteredYouTubePlaylistItem({})).toBe(false)
  })
})

describe('getPlaylistItemsPage', () => {
  function createClient(data: youtube.Schema$PlaylistItemListResponse) {
    const list = vi.fn(async () => ({ data }))

    return {
      client: { playlistItems: { list } } as unknown as youtube.Youtube,
      list,
    }
  }

  it('returns one page with the token of the next', async () => {
    const { client, list } = createClient({
      items: [
        { contentDetails: { videoId: 'a' } },
        { contentDetails: {} },
        { contentDetails: { videoId: 'b' } },
      ],
      nextPageToken: 'next',
    })

    const page = await getPlaylistItemsPage({
      client,
      pageToken: 'current',
      playlistID: 'UUxxx',
    })

    expect(list).toHaveBeenCalledWith({
      maxResults: 50,
      pageToken: 'current',
      part: ['contentDetails'],
      playlistId: 'UUxxx',
    })
    expect(page.items.map((item) => item.contentDetails.videoId)).toEqual([
      'a',
      'b',
    ])
    expect(page.nextPageToken).toBe('next')
  })

  it('reports an empty page as the last even with a token', async () => {
    const { client } = createClient({ items: [], nextPageToken: 'stale' })

    await expect(
      getPlaylistItemsPage({ client, playlistID: 'UUxxx' }),
    ).resolves.toEqual({ items: [], nextPageToken: null })
  })

  it('reports the last page', async () => {
    const { client, list } = createClient({ items: [] })

    await expect(
      getPlaylistItemsPage({ client, playlistID: 'UUxxx' }),
    ).resolves.toEqual({ items: [], nextPageToken: null })
    expect(list).toHaveBeenCalledWith(
      expect.not.objectContaining({ pageToken: expect.anything() }),
    )
  })
})

describe('getPlaylistItems', () => {
  function createClient(pages: youtube.Schema$PlaylistItemListResponse[]) {
    const list = vi.fn(async ({ pageToken }: { pageToken?: string }) => {
      const data = pages[pageToken === undefined ? 0 : Number(pageToken)]

      if (!data) {
        throw new Error(`Unexpected page token: ${pageToken}`)
      }

      return { data }
    })

    return {
      client: { playlistItems: { list } } as unknown as youtube.Youtube,
      list,
    }
  }

  it('gets only the first page by default', async () => {
    const { client, list } = createClient([
      { items: [{ contentDetails: { videoId: 'a' } }], nextPageToken: '1' },
    ])

    const items = await Array.fromAsync(
      getPlaylistItems({ client, playlistID: 'UUxxx' }),
    )

    expect(items.map((item) => item.contentDetails.videoId)).toEqual(['a'])
    expect(list).toHaveBeenCalledTimes(1)
    expect(list).toHaveBeenCalledWith({
      maxResults: 20,
      part: ['contentDetails'],
      playlistId: 'UUxxx',
    })
  })

  it('walks every page with `all`', async () => {
    const { client, list } = createClient([
      { items: [{ contentDetails: { videoId: 'a' } }], nextPageToken: '1' },
      {
        items: [{ contentDetails: {} }, { contentDetails: { videoId: 'b' } }],
        nextPageToken: '2',
      },
      { items: [{ contentDetails: { videoId: 'c' } }] },
    ])

    const items = await Array.fromAsync(
      getPlaylistItems({ all: true, client, playlistID: 'UUxxx' }),
    )

    expect(items.map((item) => item.contentDetails.videoId)).toEqual([
      'a',
      'b',
      'c',
    ])
    expect(list.mock.calls).toEqual([
      [{ maxResults: 50, part: ['contentDetails'], playlistId: 'UUxxx' }],
      [
        {
          maxResults: 50,
          pageToken: '1',
          part: ['contentDetails'],
          playlistId: 'UUxxx',
        },
      ],
      [
        {
          maxResults: 50,
          pageToken: '2',
          part: ['contentDetails'],
          playlistId: 'UUxxx',
        },
      ],
    ])
  })

  it('stops at an empty page even when YouTube returns a token', async () => {
    const { client, list } = createClient([
      { items: [{ contentDetails: { videoId: 'a' } }], nextPageToken: '1' },
      { items: [], nextPageToken: '2' },
    ])

    const items = await Array.fromAsync(
      getPlaylistItems({ all: true, client, playlistID: 'UUxxx' }),
    )

    expect(items.map((item) => item.contentDetails.videoId)).toEqual(['a'])
    expect(list).toHaveBeenCalledTimes(2)
  })
})
