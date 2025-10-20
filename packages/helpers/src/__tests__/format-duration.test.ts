import { describe, expect, it } from 'vitest'
import { formatDuration } from '../format-duration'

describe('formatDuration', () => {
  it('formats duration with hours, minutes, and seconds', () => {
    expect(formatDuration('PT1H30M15S')).toBe('1:30:15')
  })

  it('formats duration with only minutes and seconds', () => {
    expect(formatDuration('PT5M30S')).toBe('5:30')
  })

  it('formats duration with only seconds', () => {
    expect(formatDuration('PT45S')).toBe('0:45')
  })

  it('formats duration with only hours', () => {
    expect(formatDuration('PT2H')).toBe('2:00:00')
  })

  it('formats duration with hours and minutes', () => {
    expect(formatDuration('PT1H15M')).toBe('1:15:00')
  })

  it('formats duration with hours and seconds', () => {
    expect(formatDuration('PT1H30S')).toBe('1:00:30')
  })

  it('pads minutes and seconds with leading zero when hours present', () => {
    expect(formatDuration('PT1H5M3S')).toBe('1:05:03')
  })

  it('handles zero duration', () => {
    expect(formatDuration('PT0S')).toBe('0:00')
  })

  it('handles invalid format gracefully', () => {
    expect(formatDuration('invalid')).toBe('0:00')
  })

  it('handles empty string', () => {
    expect(formatDuration('')).toBe('0:00')
  })

  it('formats long duration correctly', () => {
    expect(formatDuration('PT10H59M59S')).toBe('10:59:59')
  })
})
