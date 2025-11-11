import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { server } from '../server.js'

describe('Supabase Handlers', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  describe('Videos endpoint', () => {
    it('should return mock videos data', async () => {
      const response = await fetch(
        'https://fake.supabase.test/rest/v1/videos?select=id,title&limit=2',
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
        'https://fake.supabase.test/rest/v1/videos?select=id,title,thumbnails(path,blur_data_url)',
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
        'https://fake.supabase.test/rest/v1/videos?select=*&id.in.(1,2)',
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(Array.isArray(data)).toBe(true)
      expect(data.every((video) => [1, 2].includes(video.id))).toBe(true)
    })
  })

  describe('Channels endpoint', () => {
    it('should return mock channels data', async () => {
      const response = await fetch(
        'https://fake.supabase.test/rest/v1/channels',
      )
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
        'https://fake.supabase.test/rest/v1/videos?limit=1',
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toHaveLength(1)
    })
  })

  describe('Auth endpoints', () => {
    it('should return a user and set cookies on successful login', async () => {
      const response = await fetch(
        'https://fake.supabase.test/auth/v1/token?grant_type=password',
        {
          body: JSON.stringify({
            email: 'admin@example.com',
            password: 'password123',
          }),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        },
      )
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('access_token')
      expect(data).toHaveProperty('user')

      const cookies = response.headers.get('Set-Cookie')
      expect(cookies).toContain('sb-access-token=mock_access_token')
      expect(cookies).toContain('sb-refresh-token=mock_refresh_token')
    })

    it('should return user info if cookie is present', async () => {
      const response = await fetch('https://fake.supabase.test/auth/v1/user', {
        headers: {
          Cookie: 'sb-access-token=mock_access_token',
        },
      })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id', 'mock-user-id')
      expect(data).toHaveProperty('email', 'admin@example.com')
    })

    it('should return 401 if cookie is not present', async () => {
      const response = await fetch('https://fake.supabase.test/auth/v1/user')
      expect(response.status).toBe(401)
    })

    it('should return user info if pre-authenticated via env var', async () => {
      process.env.MSW_SUPABASE_AUTHENTICATED = 'true'
      const response = await fetch('https://fake.supabase.test/auth/v1/user')
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('id', 'mock-user-id')
      // Reset env var
      delete process.env.MSW_SUPABASE_AUTHENTICATED
    })

    it('should clear cookies on logout', async () => {
      const response = await fetch(
        'https://fake.supabase.test/auth/v1/logout',
        {
          headers: {
            Cookie:
              'sb-access-token=mock_access_token; sb-refresh-token=mock_refresh_token',
          },
          method: 'POST',
        },
      )
      expect(response.status).toBe(204)
      const cookies = response.headers.get('Set-Cookie')
      expect(cookies).toContain('sb-access-token=;')
      expect(cookies).toContain('sb-refresh-token=;')
    })
  })
})
