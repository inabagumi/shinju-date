import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { server } from '../server.js'

interface ChannelListResponse {
  items: {
    id: string
    snippet: {
      thumbnails: Record<
        'default' | 'high' | 'medium',
        { height: number; url: string; width: number }
      >
    }
  }[]
}

describe('YouTube Handlers', () => {
  beforeAll(() => {
    server.listen()
  })
  afterEach(() => {
    server.resetHandlers()
  })
  afterAll(() => {
    server.close()
  })

  describe('channels.list', () => {
    it('returns the icons of each channel in square sizes', async () => {
      const response = await fetch(
        'https://youtube.googleapis.com/youtube/v3/channels?id=UCtest123&part=snippet',
      )
      const { items } = (await response.json()) as ChannelListResponse
      const thumbnails = items[0]?.snippet.thumbnails

      expect(thumbnails?.default).toEqual({
        height: 88,
        url: 'https://yt3.ggpht.com/mock-UCtest123=s88-c-k-c0x00ffffff-no-rj',
        width: 88,
      })
      expect(thumbnails?.medium).toMatchObject({ height: 240, width: 240 })
      expect(thumbnails?.high).toMatchObject({ height: 800, width: 800 })
    })
  })

  describe('channel icons', () => {
    const iconUrl =
      'https://yt3.ggpht.com/mock-UCtest123=s800-c-k-c0x00ffffff-no-rj'

    it('serves a PNG with an ETag', async () => {
      const response = await fetch(iconUrl)
      const body = new Uint8Array(await response.arrayBuffer())

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/png')
      expect(response.headers.get('ETag')).toBeTruthy()
      // PNG signature
      expect([...body.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47])
    })

    it('answers a matching conditional request with 304', async () => {
      const etag = (await fetch(iconUrl)).headers.get('ETag') ?? ''
      const response = await fetch(iconUrl, {
        headers: { 'If-None-Match': etag },
      })

      expect(response.status).toBe(304)
    })
  })
})
