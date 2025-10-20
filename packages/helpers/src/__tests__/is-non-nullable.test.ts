import { isNonNullable } from '../is-non-nullable.js'

describe('isNonNullable', () => {
  it('should return true for non-null and non-undefined values', () => {
    expect(isNonNullable('test')).toBe(true)
    expect(isNonNullable(0)).toBe(true)
    expect(isNonNullable(false)).toBe(true)
    expect(isNonNullable([])).toBe(true)
    expect(isNonNullable({})).toBe(true)
  })

  it('should return false for null', () => {
    expect(isNonNullable(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isNonNullable(undefined)).toBe(false)
  })
})
