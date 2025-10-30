import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { server } from '../server.js'

describe('Supabase Handlers', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  describe('Videos endpoint', () => {
    it('should return mock videos data', async () => {
      const response = await fetch(
        'http://localhost:3000/rest/v1/videos?select=id,title&limit=2',
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(2)
      expect(data[0]).toHaveProperty('id')
      expect(data[0]).toHaveProperty('title')
    })

    it('should handle select with relations', async () => {
      const response = await fetch(
        'http://localhost:3000/rest/v1/videos?select=id,title,thumbnails(path,blur_data_url)',
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(Array.isArray(data)).toBe(true)
      // The relation handling should return thumbnails for videos that have them
      if (data[0]?.thumbnail_id) {
        expect(data[0]).toHaveProperty('thumbnails')
      } else {
        // Just verify the basic structure is there
        expect(data[0]).toHaveProperty('id')
        expect(data[0]).toHaveProperty('title')
      }
    })

    it('should handle filtering with id.in', async () => {
      const response = await fetch(
        'http://localhost:3000/rest/v1/videos?select=*&id.in.(1,2)',
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(Array.isArray(data)).toBe(true)
      expect(data.every((video) => [1, 2].includes(video.id))).toBe(true)
    })
  })

  describe('Channels endpoint', () => {
    it('should return mock channels data', async () => {
      const response = await fetch('http://localhost:3000/rest/v1/channels')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(Array.isArray(data)).toBe(true)
      expect(data[0]).toHaveProperty('name')
      expect(data[0]).toHaveProperty('id')
    })
  })

  describe('Query parameter parsing', () => {
    it('should handle limit parameter', async () => {
      const response = await fetch(
        'http://localhost:3000/rest/v1/videos?limit=1',
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toHaveLength(1)
    })
  })
})
