import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { server } from '../server.js'

describe('Supabase Handlers', () => {
  beforeAll(() => {
    server.listen()
  })
  afterEach(() => {
    server.resetHandlers()
    delete process.env['MSW_SUPABASE_AUTHENTICATED']
  })
  afterAll(() => {
    server.close()
  })

  describe('Authentication', () => {
    describe('/auth/v1/user', () => {
      it('should return 401 if not authenticated', async () => {
        const response = await fetch('https://fake.supabase.test/auth/v1/user')
        expect(response.status).toBe(401)
      })

      it('should return user data if authenticated via cookie', async () => {
        const response = await fetch(
          'https://fake.supabase.test/auth/v1/user',
          {
            headers: {
              cookie: 'sb-access-token=mock_access_token',
            },
          },
        )
        const json = await response.json()
        expect(response.status).toBe(200)
        expect(json.id).toBe('mock-user-id')
        expect(json.email).toBe('admin@example.com')
      })

      it('should return user data if MSW_SUPABASE_AUTHENTICATED is true', async () => {
        process.env['MSW_SUPABASE_AUTHENTICATED'] = 'true'
        const response = await fetch('https://fake.supabase.test/auth/v1/user')
        const json = await response.json()
        expect(response.status).toBe(200)
        expect(json.id).toBe('mock-user-id')
      })
    })

    describe('/auth/v1/token', () => {
      it('should return tokens and set cookies for valid credentials', async () => {
        const response = await fetch(
          'https://fake.supabase.test/auth/v1/token?grant_type=password',
          {
            body: JSON.stringify({
              email: 'admin@example.com',
              password: 'password123',
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          },
        )
        const json = await response.json()
        expect(response.status).toBe(200)
        expect(json.access_token).toBe('mock_access_token')
        expect(response.headers.get('set-cookie')).toContain(
          'sb-access-token=mock_access_token',
        )
        expect(response.headers.get('set-cookie')).toContain(
          'sb-refresh-token=mock_refresh_token',
        )
      })

      it('should return 400 for invalid credentials', async () => {
        const response = await fetch(
          'https://fake.supabase.test/auth/v1/token?grant_type=password',
          {
            body: JSON.stringify({
              email: 'wrong@example.com',
              password: 'wrongpassword',
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          },
        )
        expect(response.status).toBe(400)
      })
    })

    describe('/auth/v1/logout', () => {
      it('should return 204 and clear cookies', async () => {
        const response = await fetch(
          'https://fake.supabase.test/auth/v1/logout',
          {
            method: 'POST',
          },
        )
        expect(response.status).toBe(204)
        const cookies = response.headers.get('set-cookie')
        expect(cookies).toContain('sb-access-token=;')
        expect(cookies).toContain('sb-refresh-token=;')
      })
    })
  })

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

    it('should resolve aliased relations used by the admin video list', async () => {
      const select = [
        'id',
        'title',
        'thumbnail:thumbnails(id,path,blur_data_url)',
        'talent:talents(id,name)',
        'youtube_video:youtube_videos(youtube_video_id)',
        'twitch_video:twitch_videos(twitch_video_id,type,twitch_user:twitch_users(twitch_login_name))',
      ].join(',')
      const response = await fetch(
        `https://fake.supabase.test/rest/v1/videos?select=${encodeURIComponent(select)}&limit=5`,
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      for (const video of data) {
        expect(Object.keys(video).sort()).toEqual(
          [
            'id',
            'talent',
            'thumbnail',
            'title',
            'twitch_video',
            'youtube_video',
          ].sort(),
        )
        expect(video.talent).toEqual({
          id: expect.any(String),
          name: expect.any(String),
        })
        if (video.thumbnail) {
          expect(Object.keys(video.thumbnail).sort()).toEqual(
            ['blur_data_url', 'id', 'path'].sort(),
          )
        }
        if (video.youtube_video) {
          expect(video.youtube_video).toEqual({
            youtube_video_id: expect.any(String),
          })
        }
        expect(video.twitch_video).toBeNull()
      }
    })

    it('should resolve nested relations recursively', async () => {
      const select = 'id,video:videos(id,title,thumbnail:thumbnails(id,path))'
      const response = await fetch(
        `https://fake.supabase.test/rest/v1/youtube_videos?select=${encodeURIComponent(select)}&limit=1`,
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data[0].video).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
        }),
      )
      expect(data[0].video).toHaveProperty('thumbnail')
    })

    it('should apply offset before limit', async () => {
      const allResponse = await fetch(
        'https://fake.supabase.test/rest/v1/videos?select=id',
      )
      const all = await allResponse.json()
      expect(all.length).toBeGreaterThan(2)

      const response = await fetch(
        'https://fake.supabase.test/rest/v1/videos?select=id&offset=1&limit=2',
      )
      const data = await response.json()

      expect(data).toEqual(all.slice(1, 3))
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

  describe('Storage endpoints', () => {
    describe('createSignedUrl', () => {
      it('should return a signed URL for thumbnail', async () => {
        const response = await fetch(
          'https://fake.supabase.test/storage/v1/object/sign/thumbnails/test.jpg',
          {
            method: 'POST',
          },
        )
        const data = await response.json()

        expect(response.ok).toBe(true)
        expect(data).toHaveProperty('signedURL')
        expect(data.signedURL).toContain(
          'https://fake.supabase.test/storage/v1/object/public/thumbnails/test.jpg',
        )
      })

      it('should handle nested paths in createSignedUrl', async () => {
        const response = await fetch(
          'https://fake.supabase.test/storage/v1/object/sign/thumbnails/subfolder/test.jpg',
          {
            method: 'POST',
          },
        )
        const data = await response.json()

        expect(response.ok).toBe(true)
        expect(data).toHaveProperty('signedURL')
        expect(data.signedURL).toContain(
          'https://fake.supabase.test/storage/v1/object/public/thumbnails/subfolder/test.jpg',
        )
      })
    })

    describe('GET thumbnail image', () => {
      it('should return a dummy image for simple path', async () => {
        const response = await fetch(
          'https://fake.supabase.test/storage/v1/object/public/thumbnails/test.jpg',
        )

        expect(response.ok).toBe(true)
        expect(response.headers.get('content-type')).toBe('image/svg+xml')
        const text = await response.text()
        expect(text).toContain('<svg')
      })

      it('should return a dummy image for nested path', async () => {
        const response = await fetch(
          'https://fake.supabase.test/storage/v1/object/public/thumbnails/subfolder/test.jpg',
        )

        expect(response.ok).toBe(true)
        expect(response.headers.get('content-type')).toBe('image/svg+xml')
        const text = await response.text()
        expect(text).toContain('<svg')
      })

      it('should handle thumbnails/thumbnails/ double prefix path', async () => {
        // This simulates the case where the path in the database already includes "thumbnails/"
        const response = await fetch(
          'https://fake.supabase.test/storage/v1/object/public/thumbnails/thumbnails/uuid-123.jpg',
        )

        expect(response.ok).toBe(true)
        expect(response.headers.get('content-type')).toBe('image/svg+xml')
        const text = await response.text()
        expect(text).toContain('<svg')
      })
    })
  })
})
