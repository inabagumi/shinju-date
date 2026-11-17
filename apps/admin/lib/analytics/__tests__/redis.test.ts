import { describe, expect, it } from 'vitest'
import { dailyKeys, parseScoredMembers, sumScores } from '../redis'

describe('parseScoredMembers', () => {
  it('reads scores returned as numbers', () => {
    expect(parseScoredMembers(['video1', 3, 'video2', 2])).toEqual([
      { member: 'video1', score: 3 },
      { member: 'video2', score: 2 },
    ])
  })

  it('reads scores returned as strings', () => {
    expect(parseScoredMembers(['video1', '3', 'video2', '2.5'])).toEqual([
      { member: 'video1', score: 3 },
      { member: 'video2', score: 2.5 },
    ])
  })

  it('turns members returned as numbers into strings', () => {
    expect(parseScoredMembers([2024, 5, 0, '1'])).toEqual([
      { member: '2024', score: 5 },
      { member: '0', score: 1 },
    ])
  })

  it('returns an empty array for an empty result', () => {
    expect(parseScoredMembers([])).toEqual([])
    expect(parseScoredMembers(null)).toEqual([])
    expect(parseScoredMembers(undefined)).toEqual([])
  })

  it('skips pairs without a member or a numeric score', () => {
    expect(
      parseScoredMembers([null, 1, 'video1', 'abc', 'video2', 4, 'video3']),
    ).toEqual([{ member: 'video2', score: 4 }])
  })
})

describe('sumScores', () => {
  it('sums the scores', () => {
    expect(sumScores(['video1', '3', 'video2', 2])).toBe(5)
  })

  it('returns 0 for an empty result', () => {
    expect(sumScores([])).toBe(0)
    expect(sumScores(null)).toBe(0)
  })
})

describe('dailyKeys', () => {
  it('lists the key of each day in the range', () => {
    expect(
      dailyKeys('videos:clicked:', {
        end: Temporal.PlainDate.from('2024-02-01'),
        start: Temporal.PlainDate.from('2024-01-30'),
      }),
    ).toEqual([
      'videos:clicked:20240130',
      'videos:clicked:20240131',
      'videos:clicked:20240201',
    ])
  })

  it('lists a single key when the range is a single day', () => {
    const date = Temporal.PlainDate.from('2024-01-30')

    expect(dailyKeys('videos:clicked:', { end: date, start: date })).toEqual([
      'videos:clicked:20240130',
    ])
  })

  it('returns an empty array when start is after end', () => {
    expect(
      dailyKeys('videos:clicked:', {
        end: Temporal.PlainDate.from('2024-01-30'),
        start: Temporal.PlainDate.from('2024-02-01'),
      }),
    ).toEqual([])
  })
})
