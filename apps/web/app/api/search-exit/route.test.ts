// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  trackSearchExitWithoutClick: vi.fn(),
}))

vi.mock('@/lib/session-analytics', () => ({
  trackSearchExitWithoutClick: mocks.trackSearchExitWithoutClick,
}))

vi.mock('@shinju-date/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

import { POST } from './route'

function post(body: string): Promise<Response> {
  return POST(
    new Request('https://shinju.date/api/search-exit', {
      body,
      // `navigator.sendBeacon` は文字列の本文を `text/plain` で送る
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      method: 'POST',
    }),
  )
}

describe('POST /api/search-exit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('records the exit of the query', async () => {
    const response = await post(JSON.stringify({ query: '歌' }))

    expect(response.status).toBe(204)
    expect(mocks.trackSearchExitWithoutClick).toHaveBeenCalledExactlyOnceWith(
      '歌',
    )
  })

  it.each([
    ['an empty object', '{}'],
    ['a blank query', JSON.stringify({ query: '  ' })],
    ['a query that is not a string', JSON.stringify({ query: 1 })],
    ['an array', JSON.stringify(['歌'])],
    ['a body that is not JSON', 'query=歌'],
    ['an empty body', ''],
  ])('answers 422 without recording for %s', async (_, body) => {
    const response = await post(body)

    expect(response.status).toBe(422)
    expect(mocks.trackSearchExitWithoutClick).not.toHaveBeenCalled()
  })
})
