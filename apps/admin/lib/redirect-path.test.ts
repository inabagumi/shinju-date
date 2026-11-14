import { describe, expect, it } from 'vitest'
import { getSafeRedirectPath } from './redirect-path'

describe('getSafeRedirectPath', () => {
  it.each([
    ['/analytics/click', '/analytics/click'],
    ['/analytics/click?from=2025-11-01', '/analytics/click?from=2025-11-01'],
    ['/videos#latest', '/videos#latest'],
    ['/', '/'],
  ])('keeps the admin path %s', (value, expected) => {
    expect(getSafeRedirectPath(value)).toBe(expected)
  })

  it('normalizes dot segments', () => {
    expect(getSafeRedirectPath('/videos/../talents')).toBe('/talents')
  })

  it.each([
    'https://example.com/',
    'javascript:alert(1)',
    '//example.com',
    '/\\example.com',
    '\\\\example.com',
    '/\t/example.com',
    '/\n/example.com',
    'analytics/click',
    '',
  ])('rejects %j', (value) => {
    expect(getSafeRedirectPath(value)).toBe('/')
  })

  it.each(['/login', '/login?next=/videos'])(
    'rejects the login page %s to avoid loops',
    (value) => {
      expect(getSafeRedirectPath(value)).toBe('/')
    },
  )

  it.each([null, undefined, 123, ['/videos']])(
    'rejects non-string value %j',
    (value) => {
      expect(getSafeRedirectPath(value)).toBe('/')
    },
  )

  it('returns the given fallback', () => {
    expect(getSafeRedirectPath('//example.com', '/account')).toBe('/account')
  })
})
