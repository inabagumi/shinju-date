import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAppAccessToken,
  getUsers,
  parseTwitchUserIdentifier,
  resetTwitchClientState,
  secondsToISO8601,
  twitchDurationToISO8601,
} from '../index'

describe('parseTwitchUserIdentifier', () => {
  it('parses login names', () => {
    expect(parseTwitchUserIdentifier('example_user')).toEqual({
      kind: 'login',
      login: 'example_user',
    })
    expect(parseTwitchUserIdentifier('Example_User')).toEqual({
      kind: 'login',
      login: 'example_user',
    })
    expect(parseTwitchUserIdentifier('@streamer')).toEqual({
      kind: 'login',
      login: 'streamer',
    })
  })

  it('parses numeric user IDs', () => {
    expect(parseTwitchUserIdentifier('123456789')).toEqual({
      id: '123456789',
      kind: 'id',
    })
  })

  it('parses Twitch channel URLs', () => {
    expect(
      parseTwitchUserIdentifier('https://www.twitch.tv/example_user'),
    ).toEqual({
      kind: 'login',
      login: 'example_user',
    })
    expect(
      parseTwitchUserIdentifier('https://twitch.tv/example_user/about'),
    ).toEqual({
      kind: 'login',
      login: 'example_user',
    })
    expect(parseTwitchUserIdentifier('www.twitch.tv/foo_bar')).toEqual({
      kind: 'login',
      login: 'foo_bar',
    })
  })

  it('returns null for invalid input', () => {
    expect(parseTwitchUserIdentifier('')).toBeNull()
    expect(parseTwitchUserIdentifier('ab')).toBeNull()
    expect(
      parseTwitchUserIdentifier('https://www.twitch.tv/directory'),
    ).toBeNull()
    expect(parseTwitchUserIdentifier('not a valid!!')).toBeNull()
  })
})

describe('twitchDurationToISO8601', () => {
  it('converts Twitch duration strings', () => {
    expect(twitchDurationToISO8601('1h2m3s')).toBe('PT1H2M3S')
    expect(twitchDurationToISO8601('3h0m0s')).toBe('PT3H')
    expect(twitchDurationToISO8601('45m30s')).toBe('PT45M30S')
    expect(twitchDurationToISO8601('30s')).toBe('PT30S')
    expect(twitchDurationToISO8601('0s')).toBe('PT0S')
  })

  it('returns null for invalid durations', () => {
    expect(twitchDurationToISO8601('')).toBeNull()
    expect(twitchDurationToISO8601('invalid')).toBeNull()
  })
})

describe('secondsToISO8601', () => {
  it('converts seconds', () => {
    expect(secondsToISO8601(30)).toBe('PT30S')
    expect(secondsToISO8601(90)).toBe('PT1M30S')
    expect(secondsToISO8601(3661)).toBe('PT1H1M1S')
    expect(secondsToISO8601(0)).toBe('PT0S')
  })
})

describe('getAppAccessToken', () => {
  beforeEach(() => {
    resetTwitchClientState()
    vi.stubEnv('TWITCH_CLIENT_ID', 'test-client-id')
    vi.stubEnv('TWITCH_CLIENT_SECRET', 'test-client-secret')
  })

  afterEach(() => {
    resetTwitchClientState()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('fetches and caches the app access token', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'token-1',
          expires_in: 3600,
          token_type: 'bearer',
        }),
        { status: 200 },
      ),
    )

    const token1 = await getAppAccessToken(undefined, fetchImpl)
    const token2 = await getAppAccessToken(undefined, fetchImpl)

    expect(token1).toBe('token-1')
    expect(token2).toBe('token-1')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('throws when credentials are missing', async () => {
    vi.unstubAllEnvs()
    resetTwitchClientState()
    delete process.env['TWITCH_CLIENT_ID']
    delete process.env['TWITCH_CLIENT_SECRET']

    await expect(getAppAccessToken()).rejects.toThrow(
      /Client ID and Client Secret/,
    )
  })
})

describe('getUsers Helix URL', () => {
  beforeEach(() => {
    resetTwitchClientState()
    vi.stubEnv('TWITCH_CLIENT_ID', 'test-client-id')
    vi.stubEnv('TWITCH_CLIENT_SECRET', 'test-client-secret')
  })

  afterEach(() => {
    resetTwitchClientState()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('requests https://api.twitch.tv/helix/users (not /users)', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('id.twitch.tv/oauth2/token')) {
        return new Response(
          JSON.stringify({
            access_token: 'token-1',
            expires_in: 3600,
            token_type: 'bearer',
          }),
          { status: 200 },
        )
      }

      return new Response(
        JSON.stringify({
          data: [
            {
              broadcaster_type: '',
              created_at: '2011-08-08T20:45:44Z',
              description: '',
              display_name: 'Twitch',
              id: '12826',
              login: 'twitch',
              offline_image_url: '',
              profile_image_url: '',
              type: '',
            },
          ],
        }),
        { status: 200 },
      )
    })

    vi.stubGlobal('fetch', fetchImpl)

    const users = await Array.fromAsync(getUsers({ logins: ['twitch'] }))

    expect(users).toHaveLength(1)
    expect(users[0]?.login).toBe('twitch')

    const helixCall = fetchImpl.mock.calls.find(([input]) =>
      String(input).includes('api.twitch.tv'),
    )
    expect(helixCall).toBeDefined()
    expect(String(helixCall?.[0])).toBe(
      'https://api.twitch.tv/helix/users?login=twitch',
    )
  })
})
