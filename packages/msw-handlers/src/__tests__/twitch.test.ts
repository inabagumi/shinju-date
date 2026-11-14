import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { server } from '../server.js'

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
})
