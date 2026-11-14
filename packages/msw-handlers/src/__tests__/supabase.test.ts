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

  describe('Profile images', () => {
    it('should embed channel icons and leave channels without one as null', async () => {
      const response = await fetch(
        'https://fake.supabase.test/rest/v1/youtube_channels?select=id,profile_image:profile_images(id,path,width,height,blur_data_url)',
      )
      const data = (await response.json()) as {
        id: string
        profile_image: unknown
      }[]

      expect(response.ok).toBe(true)
      expect(data.length).toBeGreaterThan(1)

      const withIcon = data.filter((channel) => channel.profile_image)

      expect(withIcon.length).toBeGreaterThan(0)
      expect(withIcon.length).toBeLessThan(data.length)
      expect(withIcon[0]).toEqual({
        id: expect.any(String),
        profile_image: {
          blur_data_url: expect.stringMatching(/^data:image\/jpeg;base64,/),
          height: 256,
          id: expect.any(String),
          path: expect.stringMatching(/^youtube\/UC\w+\/\w+\.webp$/),
          width: 256,
        },
      })
    })

    it('should look up a profile image by id', async () => {
      const channels = (await (
        await fetch(
          'https://fake.supabase.test/rest/v1/youtube_channels?select=profile_image_id',
        )
      ).json()) as { profile_image_id: string | null }[]
      const id = channels.find(
        (channel) => channel.profile_image_id,
      )?.profile_image_id

      const response = await fetch(
        `https://fake.supabase.test/rest/v1/profile_images?select=path&id=eq.${id}`,
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data).toEqual([{ path: expect.stringMatching(/\.webp$/) }])
    })

    it('should sign and serve objects in the profile-images bucket', async () => {
      const signResponse = await fetch(
        'https://fake.supabase.test/storage/v1/object/sign/profile-images/youtube/UC1/a.webp',
        { method: 'POST' },
      )
      const { signedURL } = (await signResponse.json()) as {
        signedURL: string
      }

      expect(signedURL).toBe(
        'https://fake.supabase.test/storage/v1/object/public/profile-images/youtube/UC1/a.webp',
      )

      const imageResponse = await fetch(signedURL)

      expect(imageResponse.ok).toBe(true)
      expect(imageResponse.headers.get('content-type')).toBe('image/svg+xml')
      expect(await imageResponse.text()).toContain('width="256" height="256"')
    })
  })

  describe('Twitch users', () => {
    interface TwitchUserRow {
      id: string
      profile_image: { path: string; width: number } | null
      twitch_login_name: string
      twitch_user_id: string
    }

    async function getTwitchUsers(): Promise<TwitchUserRow[]> {
      const response = await fetch(
        'https://fake.supabase.test/rest/v1/twitch_users?select=id,twitch_user_id,twitch_login_name,profile_image:profile_images(path,width)',
      )

      return (await response.json()) as TwitchUserRow[]
    }

    it('should return Twitch users with and without an icon', async () => {
      const users = await getTwitchUsers()

      expect(users).toHaveLength(2)
      expect(users.map((user) => user.profile_image)).toEqual(
        expect.arrayContaining([
          {
            path: expect.stringMatching(/^twitch\/\d+\/\w+\.webp$/),
            width: 256,
          },
          null,
        ]),
      )
    })

    it('should embed Twitch users from talents', async () => {
      const response = await fetch(
        'https://fake.supabase.test/rest/v1/talents?select=id,twitch_users(id,twitch_user_id)',
      )
      const talents = (await response.json()) as {
        twitch_users: { id: string }[]
      }[]

      expect(talents.flatMap((talent) => talent.twitch_users)).toHaveLength(2)
    })

    it('should match digit-only IDs and case-insensitive logins', async () => {
      const [user] = await getTwitchUsers()

      const byId = (await (
        await fetch(
          `https://fake.supabase.test/rest/v1/twitch_users?select=id&twitch_user_id=eq.${user?.twitch_user_id}`,
        )
      ).json()) as { id: string }[]
      const byLogin = (await (
        await fetch(
          `https://fake.supabase.test/rest/v1/twitch_users?select=id&twitch_login_name=ilike.${user?.twitch_login_name.toUpperCase()}`,
        )
      ).json()) as { id: string }[]

      expect(byId).toEqual([{ id: user?.id }])
      expect(byLogin).toEqual([{ id: user?.id }])
    })

    it('should insert, reject duplicates and delete Twitch users', async () => {
      const [talent] = (await (
        await fetch('https://fake.supabase.test/rest/v1/talents?select=id')
      ).json()) as { id: string }[]
      const newUser = {
        name: 'New User',
        talent_id: talent?.id,
        twitch_login_name: 'new_user',
        twitch_user_id: '999999999',
      }

      const created = await fetch(
        'https://fake.supabase.test/rest/v1/twitch_users?select=id,twitch_user_id',
        {
          body: JSON.stringify(newUser),
          headers: { Prefer: 'return=representation' },
          method: 'POST',
        },
      )
      const [createdUser] = (await created.json()) as {
        id: string
        twitch_user_id: string
      }[]

      expect(created.status).toBe(201)
      expect(createdUser?.twitch_user_id).toBe('999999999')

      const duplicate = await fetch(
        'https://fake.supabase.test/rest/v1/twitch_users',
        { body: JSON.stringify(newUser), method: 'POST' },
      )

      expect(duplicate.status).toBe(409)

      const deleted = await fetch(
        `https://fake.supabase.test/rest/v1/twitch_users?id=eq.${createdUser?.id}`,
        { method: 'DELETE' },
      )

      expect(deleted.status).toBe(204)
      expect(await getTwitchUsers()).toHaveLength(2)
    })
  })

  describe('Video backfill history', () => {
    interface BackfillRow {
      account_id: string
      finished_at: string
      platform: 'youtube' | 'twitch'
      status: 'done' | 'failed'
      talents: { name: string } | null
    }

    it('should return the history newest first with talent names', async () => {
      const response = await fetch(
        'https://fake.supabase.test/rest/v1/video_backfill_jobs?select=account_id,platform,status,finished_at,talents(name)&order=finished_at.desc&limit=50',
      )
      const rows = (await response.json()) as BackfillRow[]

      expect(rows).toHaveLength(3)
      expect(rows.map((row) => row.finished_at)).toEqual(
        rows
          .map((row) => row.finished_at)
          .sort()
          .reverse(),
      )
      expect(rows.every((row) => typeof row.talents?.name === 'string')).toBe(
        true,
      )
    })

    it('should return only the latest job of each account', async () => {
      const response = await fetch(
        'https://fake.supabase.test/rest/v1/video_backfill_latest_jobs?select=account_id,platform,status',
      )
      const rows = (await response.json()) as BackfillRow[]

      expect(
        rows.map(({ platform, status }) => ({ platform, status })),
      ).toEqual(
        expect.arrayContaining([
          { platform: 'twitch', status: 'failed' },
          { platform: 'youtube', status: 'done' },
        ]),
      )
      expect(rows).toHaveLength(2)
    })

    it('should count every matching row of a page', async () => {
      const response = await fetch(
        'https://fake.supabase.test/rest/v1/video_backfill_jobs?select=id&limit=1',
        { headers: { prefer: 'count=exact' } },
      )

      expect(await response.json()).toHaveLength(1)
      expect(response.headers.get('content-range')).toBe('0-0/3')
    })

    it('should count every matching row in a HEAD request with a limit', async () => {
      const response = await fetch(
        'https://fake.supabase.test/rest/v1/video_backfill_jobs?select=id&limit=1',
        { headers: { prefer: 'count=exact' }, method: 'HEAD' },
      )

      expect(response.headers.get('content-range')).toBe('0-0/3')
    })

    it('should count the accounts whose latest job failed', async () => {
      const response = await fetch(
        'https://fake.supabase.test/rest/v1/video_backfill_latest_jobs?select=id&status=eq.failed',
        { headers: { prefer: 'count=exact' }, method: 'HEAD' },
      )

      expect(response.headers.get('content-range')).toBe('0-0/1')
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
