import { describe, expect, it } from 'vitest'
import { getErrorStatus } from './errors.js'

describe('getErrorStatus', () => {
  it('reads `statusCode`', () => {
    expect(
      getErrorStatus(
        Object.assign(new Error('Encountered HTTP status code 404'), {
          statusCode: 404,
        }),
      ),
    ).toBe(404)
  })

  it('returns undefined without a status', () => {
    expect(getErrorStatus(new Error('failed'))).toBeUndefined()
    expect(getErrorStatus({ statusCode: '404' })).toBeUndefined()
    expect(getErrorStatus(404)).toBeUndefined()
    expect(getErrorStatus(null)).toBeUndefined()
  })
})
