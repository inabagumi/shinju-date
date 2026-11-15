import { describe, expect, test } from 'vitest'
import {
  formatScheduleDay,
  formatWeekRange,
  getSchedulePath,
  getWeekDays,
  getWeekStart,
  parseScheduleDate,
} from '../schedule'

function date(value: string) {
  return Temporal.PlainDate.from(value)
}

describe('parseScheduleDate', () => {
  test('should read a date in YYYY-MM-DD', () => {
    expect(parseScheduleDate('2026-11-12')?.toString()).toBe('2026-11-12')
    expect(parseScheduleDate('2028-02-29')?.toString()).toBe('2028-02-29')
  })

  test.each([
    '',
    'today',
    '2026-W46',
    '20261112',
    '2026-11-1',
    '2026/11/12',
    '2026-11-12T00:00',
    '+002026-11-12',
    ' 2026-11-12',
  ])('should not read %j', (value) => {
    expect(parseScheduleDate(value)).toBeNull()
  })

  test.each([
    '2026-02-29',
    '2026-02-30',
    '2026-13-01',
    '2026-00-10',
    '2026-11-31',
  ])('should not read the date that does not exist: %s', (value) => {
    expect(parseScheduleDate(value)).toBeNull()
  })
})

describe('getWeekStart', () => {
  test('should return the Monday of the week', () => {
    // From Monday, 9 November 2026 to Sunday, 15 November 2026
    for (const day of [9, 10, 11, 12, 13, 14, 15]) {
      expect(
        getWeekStart(
          Temporal.PlainDate.from({ day, month: 11, year: 2026 }),
        ).toString(),
      ).toBe('2026-11-09')
    }

    expect(getWeekStart(date('2026-11-16')).toString()).toBe('2026-11-16')
  })

  test('should go back across the months and the years', () => {
    expect(getWeekStart(date('2026-12-02')).toString()).toBe('2026-11-30')
    // 1 January 2027 is a Friday, in the week of 28 December 2026
    expect(getWeekStart(date('2027-01-01')).toString()).toBe('2026-12-28')
    expect(getWeekStart(date('2027-01-03')).toString()).toBe('2026-12-28')
    expect(getWeekStart(date('2027-01-04')).toString()).toBe('2027-01-04')
  })
})

describe('getWeekDays', () => {
  test('should return the 7 days from Monday to Sunday', () => {
    expect(
      getWeekDays(date('2026-12-28')).map((day) => day.toString()),
    ).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ])
  })
})

describe('getSchedulePath', () => {
  test('should always point to the Monday', () => {
    expect(getSchedulePath(date('2026-11-09'))).toBe('/schedule/2026-11-09')
    expect(getSchedulePath(date('2026-11-12'))).toBe('/schedule/2026-11-09')
    expect(getSchedulePath(date('2027-01-01'))).toBe('/schedule/2026-12-28')
  })
})

describe('formatWeekRange', () => {
  test('should omit the month and the year of Sunday when they are the same', () => {
    expect(formatWeekRange(date('2026-11-09'))).toBe('2026年11月9日〜15日')
  })

  test('should write the month of Sunday in another month', () => {
    expect(formatWeekRange(date('2026-11-30'))).toBe('2026年11月30日〜12月6日')
  })

  test('should write the year of Sunday in another year', () => {
    expect(formatWeekRange(date('2026-12-28'))).toBe(
      '2026年12月28日〜2027年1月3日',
    )
  })
})

describe('formatScheduleDay', () => {
  test('should write the month, the day and the weekday', () => {
    expect(formatScheduleDay(date('2026-11-09'))).toBe('11/9（月）')
    expect(formatScheduleDay(date('2026-11-15'))).toBe('11/15（日）')
  })
})
