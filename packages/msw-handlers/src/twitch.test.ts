import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ensureCollectionsSeeded,
  twitchUsers,
  twitchVideos,
  videos,
} from './collections.js'
import { server } from './server.js'

interface UsersResponse {
  data: {
    display_name: string
    id: string
    login: string
    profile_image_url: string
  }[]
}

async function getUsers(query: string): Promise<UsersResponse['data']> {
  const response = await fetch(`https://api.twitch.tv/helix/users?${query}`)
  const { data } = (await response.json()) as UsersResponse

  return data
}

describe('Twitch Handlers', () => {
  beforeAll(() => {
    server.listen()
  })
  afterEach(() => {
    server.resetHandlers()
  })
  afterAll(() => {
    server.close()
  })

  it('issues an app access token', async () => {
    const response = await fetch(
      'https://id.twitch.tv/oauth2/token?client_id=id&client_secret=secret&grant_type=client_credentials',
      { method: 'POST' },
    )

    expect(await response.json()).toMatchObject({
      access_token: expect.any(String),
      token_type: 'bearer',
    })
  })

  describe('users', () => {
    it('returns users by ID with their icons', async () => {
      const [user] = await getUsers('id=100000001')

      expect(user).toMatchObject({
        display_name: 'Test User 1',
        id: '100000001',
        login: 'testuser1',
        profile_image_url:
          'https://static-cdn.jtvnw.net/jtv_user_pictures/mock-100000001-profile_image-300x300.png',
      })
    })

    it('returns a default icon for a user without one', async () => {
      const [user] = await getUsers('id=100000002')

      expect(user?.profile_image_url).toMatch(
        /^https:\/\/static-cdn\.jtvnw\.net\/user-default-pictures-uv\//,
      )
    })

    it('answers any other numeric ID, e.g. of seeded users', async () => {
      const users = await getUsers('id=123456789&id=not-a-number')

      expect(users).toEqual([
        expect.objectContaining({ id: '123456789', login: 'user123456789' }),
      ])
    })

    it('returns users by login', async () => {
      expect(await getUsers('login=TestUser2')).toEqual([
        expect.objectContaining({ id: '100000002' }),
      ])
      expect(await getUsers('login=unknown')).toEqual([])
    })

    it('rejects a request without IDs or logins', async () => {
      const response = await fetch('https://api.twitch.tv/helix/users')

      expect(response.status).toBe(400)
    })
  })

  describe('user icons', () => {
    const iconUrl =
      'https://static-cdn.jtvnw.net/jtv_user_pictures/mock-100000001-profile_image-300x300.png'

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

  describe('videos, streams and clips', () => {
    const HELIX_URL = 'https://api.twitch.tv/helix'

    interface HelixPage<Item> {
      data: Item[]
      pagination: { cursor?: string }
    }

    interface HelixVideo {
      duration: string
      id: string
      published_at: string
      stream_id: string | null
      type: string
      user_id: string
    }

    async function getPage<Item>(path: string): Promise<HelixPage<Item>> {
      const response = await fetch(`${HELIX_URL}/${path}`)

      expect(response.status).toBe(200)

      return (await response.json()) as HelixPage<Item>
    }

    /** The Twitch videos of the Supabase mock, with their users. */
    async function getSavedVideos() {
      await ensureCollectionsSeeded()

      const users = new Map(
        twitchUsers.findMany().map((user) => [user.id, user]),
      )
      const savedVideos = new Map(
        videos.findMany().map((video) => [video.id, video]),
      )

      return twitchVideos.findMany().map((twitchVideo) => ({
        twitchVideo,
        user: users.get(twitchVideo.twitch_user_id),
        video: savedVideos.get(twitchVideo.video_id),
      }))
    }

    it('lists the archives, highlights and uploads of a user from the Supabase mock, newest first', async () => {
      const saved = await getSavedVideos()
      const userIds = [
        ...new Set(saved.map(({ user }) => user?.twitch_user_id ?? '')),
      ]

      expect(userIds.length).toBeGreaterThan(1)

      for (const userId of userIds) {
        const { data } = await getPage<HelixVideo>(
          `videos?user_id=${userId}&type=all&first=100`,
        )
        const expected = saved.filter(
          ({ twitchVideo, user }) =>
            user?.twitch_user_id === userId &&
            ['archive', 'highlight', 'upload'].includes(twitchVideo.type ?? ''),
        )

        expect(data.map(({ id }) => id).sort()).toEqual(
          expected.map(({ twitchVideo }) => twitchVideo.twitch_video_id).sort(),
        )
        expect(data.map(({ published_at }) => published_at)).toEqual(
          data
            .map(({ published_at }) => published_at)
            .toSorted((a, b) => Temporal.Instant.compare(b, a)),
        )
      }
    })

    it('returns the videos in the format of Helix', async () => {
      const [archive] = (await getSavedVideos()).filter(
        ({ twitchVideo }) => twitchVideo.type === 'archive',
      )
      const { data } = await getPage<HelixVideo>(
        `videos?id=${archive?.twitchVideo.twitch_video_id}`,
      )

      expect(data).toEqual([
        expect.objectContaining({
          duration: '2h34m12s',
          id: archive?.twitchVideo.twitch_video_id,
          published_at: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
          ),
          stream_id: archive?.twitchVideo.stream_id,
          thumbnail_url: expect.stringContaining('%{width}x%{height}'),
          type: 'archive',
          user_id: archive?.user?.twitch_user_id,
        }),
      ])
    })

    it('filters the videos of a user by type', async () => {
      const [highlight] = (await getSavedVideos()).filter(
        ({ twitchVideo }) => twitchVideo.type === 'highlight',
      )
      const { data } = await getPage<HelixVideo>(
        `videos?user_id=${highlight?.user?.twitch_user_id}&type=highlight`,
      )

      expect(data.map(({ id }) => id)).toEqual([
        highlight?.twitchVideo.twitch_video_id,
      ])
    })

    it('pages the videos of a user with a cursor', async () => {
      const [archive] = (await getSavedVideos()).filter(
        ({ twitchVideo }) => twitchVideo.type === 'archive',
      )
      const userId = archive?.user?.twitch_user_id
      const all = await getPage<HelixVideo>(`videos?user_id=${userId}`)
      const first = await getPage<HelixVideo>(
        `videos?user_id=${userId}&first=1`,
      )
      const second = await getPage<HelixVideo>(
        `videos?user_id=${userId}&first=1&after=${first.pagination.cursor}`,
      )

      expect(all.data.length).toBeGreaterThan(1)
      expect(first.data).toEqual(all.data.slice(0, 1))
      expect(second.data).toEqual(all.data.slice(1, 2))
    })

    it('returns 404 for a lookup by an ID that does not exist, like Helix', async () => {
      const [archive] = (await getSavedVideos()).filter(
        ({ twitchVideo }) => twitchVideo.type === 'archive',
      )
      const response = await fetch(
        `${HELIX_URL}/videos?id=${archive?.twitchVideo.twitch_video_id}&id=1`,
      )

      expect(response.status).toBe(404)
    })

    it('requires one of id, user_id and game_id for videos', async () => {
      expect((await fetch(`${HELIX_URL}/videos`)).status).toBe(400)
      expect((await fetch(`${HELIX_URL}/videos?id=1&user_id=2`)).status).toBe(
        400,
      )
    })

    it('returns the live streams from the LIVE videos of the Supabase mock', async () => {
      const [live] = (await getSavedVideos()).filter(
        ({ video }) => video?.status === 'LIVE',
      )
      const userId = live?.user?.twitch_user_id
      const others = (await getSavedVideos())
        .map(({ user }) => user?.twitch_user_id)
        .filter((id) => id !== userId)
      const { data } = await getPage<{ id: string; user_id: string }>(
        `streams?user_id=${userId}`,
      )
      const offline = await getPage<unknown>(`streams?user_id=${others[0]}`)

      expect(live?.twitchVideo.stream_id).toBeTruthy()
      expect(data).toEqual([
        expect.objectContaining({
          id: live?.twitchVideo.stream_id,
          type: 'live',
          user_id: userId,
        }),
      ])
      expect(offline.data).toEqual([])
    })

    it('returns the clips of the Supabase mock and leaves out the missing ones', async () => {
      const [clip] = (await getSavedVideos()).filter(
        ({ twitchVideo }) => twitchVideo.type === 'clip',
      )
      const { data } = await getPage<{
        broadcaster_id: string
        duration: number
        id: string
      }>(`clips?id=${clip?.twitchVideo.twitch_video_id}&id=MissingClip`)

      expect(data).toEqual([
        expect.objectContaining({
          broadcaster_id: clip?.user?.twitch_user_id,
          duration: 28,
          id: clip?.twitchVideo.twitch_video_id,
        }),
      ])
    })

    it('serves the thumbnails', async () => {
      const [archive] = (await getSavedVideos()).filter(
        ({ twitchVideo }) => twitchVideo.type === 'archive',
      )
      const {
        data: [video],
      } = await getPage<{ thumbnail_url: string }>(
        `videos?id=${archive?.twitchVideo.twitch_video_id}`,
      )
      const response = await fetch(
        (video?.thumbnail_url ?? '')
          .replace('%{width}', '640')
          .replace('%{height}', '360'),
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/png')
    })
  })
})
