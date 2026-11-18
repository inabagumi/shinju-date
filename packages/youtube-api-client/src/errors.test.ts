import { describe, expect, it } from 'vitest'
import { getErrorStatus } from './errors.js'

describe('getErrorStatus', () => {
  it('reads `status`', () => {
    expect(getErrorStatus({ status: 404 })).toBe(404)
  })

  it('reads `response.status`', () => {
    expect(getErrorStatus({ response: { status: 403 } })).toBe(403)
  })

  it('reads `code`, also as a string', () => {
    expect(getErrorStatus({ code: 500 })).toBe(500)
    expect(getErrorStatus({ code: '404' })).toBe(404)
  })

  it('returns undefined without a status', () => {
    expect(getErrorStatus(new Error('failed'))).toBeUndefined()
    expect(getErrorStatus({ code: 'ECONNRESET' })).toBeUndefined()
    expect(getErrorStatus('404')).toBeUndefined()
    expect(getErrorStatus(null)).toBeUndefined()
  })
})
