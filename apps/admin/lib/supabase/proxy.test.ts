// @vitest-environment node

import { server } from '@shinju-date/msw-handlers/server'
import { NextRequest } from 'next/server'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { updateSession } from './proxy'

/**
 * MSW のモックに対して `updateSession()` を実行し、
 * `MSW_SUPABASE_AUTHENTICATED` の設定が反映されることを確認する。
 */
describe('updateSession with MSW', () => {
  beforeAll(() => {
    server.listen({ onUnhandledFrame: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
    vi.unstubAllEnvs()
  })

  afterAll(() => {
    server.close()
  })

  function stubEnv(authenticated: boolean) {
    vi.stubEnv('ENABLE_MSW', 'true')
    vi.stubEnv('MSW_SUPABASE_AUTHENTICATED', authenticated ? 'true' : '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'fake')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fake.supabase.test')
  }

  it('lets requests without cookies through when MSW_SUPABASE_AUTHENTICATED is true', async () => {
    stubEnv(true)

    const response = await updateSession(
      new NextRequest('http://localhost:4000/analytics/click'),
    )

    expect(response.headers.get('location')).toBeNull()
  })

  it('redirects /login to the dashboard when MSW_SUPABASE_AUTHENTICATED is true', async () => {
    stubEnv(true)

    const response = await updateSession(
      new NextRequest('http://localhost:4000/login'),
    )

    expect(response.headers.get('location')).toBe('http://localhost:4000/')
  })

  it('redirects requests without cookies to the login page otherwise', async () => {
    stubEnv(false)

    const response = await updateSession(
      new NextRequest('http://localhost:4000/analytics/click'),
    )

    expect(response.headers.get('location')).toBe(
      'http://localhost:4000/login?=%2Fanalytics%2Fclick',
    )
  })
})
