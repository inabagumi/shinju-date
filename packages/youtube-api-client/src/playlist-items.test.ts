import type { youtube_v3 as youtube } from '@googleapis/youtube'
import { describe, expect, it, vi } from 'vitest'
import {
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
