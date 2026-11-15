import { describe, expect, test } from 'vitest'
import {
  formatScheduleDay,
  formatWeekRange,
  getSchedulePath,
  getScheduleWeekRange,
  getStartHour,
  getWeekDays,
  getWeekStart,
  groupByStartTime,
  isWeekInRange,
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
  test('should point to the current week without a date', () => {
    expect(getSchedulePath()).toBe('/schedule')
  })

  test('should always point to the Monday', () => {
    expect(getSchedulePath(date('2026-11-09'))).toBe('/schedule/2026-11-09')
    expect(getSchedulePath(date('2026-11-12'))).toBe('/schedule/2026-11-09')
    expect(getSchedulePath(date('2027-01-01'))).toBe('/schedule/2026-12-28')
  })
})

describe('getScheduleWeekRange', () => {
  const today = date('2026-11-12')

  test('should range from the week of the oldest video to 4 weeks later', () => {
    const range = getScheduleWeekRange({
      oldestDate: date('2024-03-14'),
      today,
    })

    expect(range.first.toString()).toBe('2024-03-11')
    expect(range.last.toString()).toBe('2026-12-07')
  })

  test('should start from the current week without any video', () => {
    expect(
      getScheduleWeekRange({ oldestDate: null, today }).first.toString(),
    ).toBe('2026-11-09')
  })

  test('should not start after the current week', () => {
    expect(
      getScheduleWeekRange({
        oldestDate: date('2026-11-20'),
        today,
      }).first.toString(),
    ).toBe('2026-11-09')
  })
})

describe('isWeekInRange', () => {
  const range = getScheduleWeekRange({
    oldestDate: date('2026-10-28'),
    today: date('2026-11-12'),
  })

  test('should accept the weeks from the first to the last', () => {
    expect(isWeekInRange(date('2026-10-26'), range)).toBe(true)
    expect(isWeekInRange(date('2026-11-09'), range)).toBe(true)
    expect(isWeekInRange(date('2026-12-07'), range)).toBe(true)
  })

  test('should reject the weeks before the oldest video and after 4 weeks', () => {
    expect(isWeekInRange(date('2026-10-19'), range)).toBe(false)
    expect(isWeekInRange(date('2026-12-14'), range)).toBe(false)
  })
})

describe('formatWeekRange', () => {
  test('should write the month of Sunday', () => {
    expect(formatWeekRange(date('2026-11-09'))).toBe('2026年11月9日〜11月15日')
    expect(formatWeekRange(date('2026-11-30'))).toBe('2026年11月30日〜12月6日')
  })

  test('should write the year of Sunday in another year', () => {
    expect(formatWeekRange(date('2026-12-28'))).toBe(
      '2026年12月28日〜2027年1月3日',
    )
  })

  test('should add the weekdays', () => {
    expect(formatWeekRange(date('2026-11-09'), { withWeekdays: true })).toBe(
      '2026年11月9日（月）〜11月15日（日）',
    )
  })
})

describe('formatScheduleDay', () => {
  test('should write the month, the day and the weekday', () => {
    expect(formatScheduleDay(date('2026-11-09'))).toBe('11/09（月）')
    expect(formatScheduleDay(date('2026-11-15'))).toBe('11/15（日）')
  })
})

describe('getStartHour', () => {
  test('should return the hour in Japan', () => {
    // 21:30 and 00:10 on the next day in Japan
    expect(getStartHour('2026-11-09T12:30:00Z')).toBe(21)
    expect(getStartHour('2026-11-09T15:10:00Z')).toBe(0)
  })
})

describe('groupByStartTime', () => {
  test('should group the videos that start at the same minute, in order', () => {
    const groups = groupByStartTime([
      { id: 'c', published_at: '2026-11-09T12:58:00Z' },
      { id: 'a', published_at: '2026-11-09T09:00:00Z' },
      { id: 'b', published_at: '2026-11-09T09:00:30Z' },
      { id: 'd', published_at: '2026-11-09T12:02:00Z' },
    ])

    expect(
      groups.map(({ items, time }) => [time, items.map((item) => item.id)]),
    ).toEqual([
      ['18:00', ['a', 'b']],
      ['21:02', ['d']],
      ['21:58', ['c']],
    ])
  })
})
