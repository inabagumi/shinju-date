import { describe, expect, test } from 'vitest'
import { type EnvSource, parseEnv } from '../env'

const API_KEYS = {
  GOOGLE_API_KEY: 'google-api-key',
  TWITCH_CLIENT_ID: 'twitch-client-id',
  TWITCH_CLIENT_SECRET: 'twitch-client-secret',
} as const satisfies EnvSource

const REQUIRED_ENV = {
  ...API_KEYS,
  NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.test',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  UPSTASH_REDIS_REST_TOKEN: 'redis-token',
  UPSTASH_REDIS_REST_URL: 'https://upstash.test',
} as const satisfies EnvSource

type RequiredName = keyof typeof REQUIRED_ENV

function without(...names: RequiredName[]): EnvSource {
  return Object.fromEntries(
    Object.entries(REQUIRED_ENV).filter(
      ([name]) => !names.includes(name as RequiredName),
    ),
  )
}

function errorOf(callback: () => unknown): Error {
  try {
    callback()
  } catch (error) {
    if (error instanceof Error) {
      return error
    }
  }

  throw new Error('Expected an error to be thrown.')
}

describe('parseEnv', () => {
  test('returns the variables when every required one is set', () => {
    expect(parseEnv(REQUIRED_ENV)).toMatchObject(REQUIRED_ENV)
  })

  test.each(Object.keys(REQUIRED_ENV) as RequiredName[])(
    'throws an error naming %s when it is missing',
    (name) => {
      expect(() => parseEnv(without(name))).toThrow(name)
    },
  )

  test('treats an empty variable as missing', () => {
    expect(() =>
      parseEnv({ ...REQUIRED_ENV, SUPABASE_SERVICE_ROLE_KEY: '' }),
    ).toThrow('SUPABASE_SERVICE_ROLE_KEY: is not set')
  })

  test('names every missing variable at once', () => {
    const { message } = errorOf(() => parseEnv({}))

    for (const name of Object.keys(REQUIRED_ENV)) {
      expect(message).toContain(name)
    }
  })

  test.each(['NEXT_PUBLIC_SUPABASE_URL', 'UPSTASH_REDIS_REST_URL'] as const)(
    'throws an error naming %s when it is not a URL',
    (name) => {
      expect(() => parseEnv({ ...REQUIRED_ENV, [name]: 'not a url' })).toThrow(
        `${name}: is not a valid URL`,
      )
    },
  )

  test('does not need the API keys when ENABLE_MSW is true', () => {
    const env = parseEnv({
      ...without('GOOGLE_API_KEY', 'TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET'),
      ENABLE_MSW: 'true',
    })

    expect(env.GOOGLE_API_KEY).toBeUndefined()
    expect(env.TWITCH_CLIENT_ID).toBeUndefined()
    expect(env.TWITCH_CLIENT_SECRET).toBeUndefined()
  })

  test.each(Object.keys(API_KEYS) as (keyof typeof API_KEYS)[])(
    'still needs %s when ENABLE_MSW is not true',
    (name) => {
      expect(() => parseEnv({ ...without(name), ENABLE_MSW: 'false' })).toThrow(
        `${name}: is not set (required unless ENABLE_MSW=true)`,
      )
    },
  )

  test('leaves the optional variables unset', () => {
    const env = parseEnv(REQUIRED_ENV)

    expect(env.CRON_SECRET).toBeUndefined()
    expect(env.REVALIDATE_SECRET_TOKEN).toBeUndefined()
    expect(env.REVALIDATE_URL).toBeUndefined()
  })

  test('treats an empty CRON_SECRET as unset', () => {
    expect(parseEnv({ ...REQUIRED_ENV, CRON_SECRET: '' }).CRON_SECRET).toBe(
      undefined,
    )
    expect(
      parseEnv({ ...REQUIRED_ENV, CRON_SECRET: 'secret' }).CRON_SECRET,
    ).toBe('secret')
  })

  test.each([
    ['true', true],
    ['false', false],
    [undefined, false],
  ])('reads ENABLE_MSW=%s as %s', (value, expected) => {
    expect(parseEnv({ ...REQUIRED_ENV, ENABLE_MSW: value }).ENABLE_MSW).toBe(
      expected,
    )
  })
})
