import { formatNumber } from '../format-number.js'

describe('formatNumber', () => {
  it('should format numbers with comma separators for ja-JP locale', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1234567)).toBe('1,234,567')
    expect(formatNumber(999)).toBe('999')
  })

  it('should format zero', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('should format negative numbers', () => {
    expect(formatNumber(-1000)).toBe('-1,000')
    expect(formatNumber(-1234567)).toBe('-1,234,567')
  })

  it('should format small numbers without separators', () => {
    expect(formatNumber(1)).toBe('1')
    expect(formatNumber(99)).toBe('99')
    expect(formatNumber(999)).toBe('999')
  })

  it('should format large numbers with separators', () => {
    expect(formatNumber(1000000)).toBe('1,000,000')
    expect(formatNumber(1000000000)).toBe('1,000,000,000')
  })

  it('should format decimal numbers', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56')
  })
})
