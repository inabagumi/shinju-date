import { Temporal } from 'temporal-polyfill'
import { describe, expect, it } from 'vitest'
import formatDuration from '../format-duration'

describe('formatDuration', () => {
  it('formats duration with hours, minutes, and seconds', () => {
    const duration = Temporal.Duration.from({
      hours: 1,
      minutes: 30,
      seconds: 15,
    })
    expect(formatDuration(duration)).toBe('1:30:15')
  })

  it('formats duration with only minutes and seconds', () => {
    const duration = Temporal.Duration.from({ minutes: 5, seconds: 30 })
    expect(formatDuration(duration)).toBe('5:30')
  })

  it('formats duration with only seconds', () => {
    const duration = Temporal.Duration.from({ seconds: 45 })
    expect(formatDuration(duration)).toBe('0:45')
  })

  it('formats duration with only hours', () => {
    const duration = Temporal.Duration.from({ hours: 2 })
    expect(formatDuration(duration)).toBe('2:00:00')
  })

  it('formats duration with hours and minutes', () => {
    const duration = Temporal.Duration.from({ hours: 1, minutes: 15 })
    expect(formatDuration(duration)).toBe('1:15:00')
  })

  it('formats duration with hours and seconds', () => {
    const duration = Temporal.Duration.from({ hours: 1, seconds: 30 })
    expect(formatDuration(duration)).toBe('1:00:30')
  })

  it('pads minutes and seconds with leading zero when hours present', () => {
    const duration = Temporal.Duration.from({
      hours: 1,
      minutes: 5,
      seconds: 3,
    })
    expect(formatDuration(duration)).toBe('1:05:03')
  })

  it('handles zero duration', () => {
    const duration = Temporal.Duration.from({ seconds: 0 })
    expect(formatDuration(duration)).toBe('0:00')
  })

  it('formats long duration correctly', () => {
    const duration = Temporal.Duration.from({
      hours: 10,
      minutes: 59,
      seconds: 59,
    })
    expect(formatDuration(duration)).toBe('10:59:59')
  })

  it('formats duration from ISO 8601 string', () => {
    const duration = Temporal.Duration.from('PT1H30M15S')
    expect(formatDuration(duration)).toBe('1:30:15')
  })

  it('formats duration from ISO 8601 string with only minutes', () => {
    const duration = Temporal.Duration.from('PT5M30S')
    expect(formatDuration(duration)).toBe('5:30')
  })
})
