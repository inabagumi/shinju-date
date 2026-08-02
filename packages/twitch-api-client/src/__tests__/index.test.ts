import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
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

describe('getTwitchCredentials', () => {
  beforeEach(() => {
    resetTwitchClientState()
  })

  afterEach(() => {
    resetTwitchClientState()
    vi.unstubAllEnvs()
  })

  it('throws when credentials are missing', async () => {
    vi.stubEnv('TWITCH_CLIENT_ID', '')
    vi.stubEnv('TWITCH_CLIENT_SECRET', '')
    delete process.env['TWITCH_CLIENT_ID']
    delete process.env['TWITCH_CLIENT_SECRET']

    const { getTwitchCredentials } = await import('../index')
    expect(() => getTwitchCredentials()).toThrow(/Client ID and Client Secret/)
  })

  it('reads credentials from the environment', async () => {
    vi.stubEnv('TWITCH_CLIENT_ID', 'test-client-id')
    vi.stubEnv('TWITCH_CLIENT_SECRET', 'test-client-secret')

    const { getTwitchCredentials } = await import('../index')
    expect(getTwitchCredentials()).toEqual({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    })
  })
})
