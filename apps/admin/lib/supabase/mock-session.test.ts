import { MOCK_SUPABASE_SESSION } from '@shinju-date/msw-handlers/session'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { withMockSessionCookie } from './mock-session'

const SUPABASE_URL = 'https://fake.supabase.test'

describe('withMockSessionCookie', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('adds the mock session when MSW_SUPABASE_AUTHENTICATED is true', async () => {
    vi.stubEnv('ENABLE_MSW', 'true')
    vi.stubEnv('MSW_SUPABASE_AUTHENTICATED', 'true')

    const cookies = [{ name: 'other', value: 'value' }]

    await expect(withMockSessionCookie(SUPABASE_URL, cookies)).resolves.toEqual(
      [
        { name: 'other', value: 'value' },
        {
          name: 'sb-fake-auth-token',
          value: JSON.stringify(MOCK_SUPABASE_SESSION),
        },
      ],
    )
  })

  it.each(['sb-fake-auth-token', 'sb-fake-auth-token.0'])(
    'keeps the session cookie (%s) of a signed-in user',
    async (name) => {
      vi.stubEnv('ENABLE_MSW', 'true')
      vi.stubEnv('MSW_SUPABASE_AUTHENTICATED', 'true')

      const cookies = [{ name, value: 'session' }]

      await expect(
        withMockSessionCookie(SUPABASE_URL, cookies),
      ).resolves.toEqual(cookies)
    },
  )

  it.each([
    { ENABLE_MSW: 'true', MSW_SUPABASE_AUTHENTICATED: '' },
    { ENABLE_MSW: '', MSW_SUPABASE_AUTHENTICATED: 'true' },
    { ENABLE_MSW: '', MSW_SUPABASE_AUTHENTICATED: '' },
  ])('does not add the mock session with %o', async (env) => {
    vi.stubEnv('ENABLE_MSW', env.ENABLE_MSW)
    vi.stubEnv('MSW_SUPABASE_AUTHENTICATED', env.MSW_SUPABASE_AUTHENTICATED)

    await expect(withMockSessionCookie(SUPABASE_URL, [])).resolves.toEqual([])
  })
})
