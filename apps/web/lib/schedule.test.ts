import { describe, expect, test } from 'vitest'
import {
  formatWeekRange,
  getLengthMinutes,
  getSchedulePath,
  getScheduleWeekRange,
  getWeekDays,
  getWeekStart,
  isWeekInRange,
  layoutDay,
  parseScheduleDate,
  type ScheduleLayout,
} from './schedule'

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
  test('should return the Sunday of the week', () => {
    // From Sunday, 8 November 2026 to Saturday, 14 November 2026
    for (const day of [8, 9, 10, 11, 12, 13, 14]) {
      expect(
        getWeekStart(
          Temporal.PlainDate.from({ day, month: 11, year: 2026 }),
        ).toString(),
      ).toBe('2026-11-08')
    }

    expect(getWeekStart(date('2026-11-15')).toString()).toBe('2026-11-15')
  })

  test('should go back across the months and the years', () => {
    expect(getWeekStart(date('2026-12-02')).toString()).toBe('2026-11-29')
    // 1 January 2027 is a Friday, in the week of 27 December 2026
    expect(getWeekStart(date('2027-01-01')).toString()).toBe('2026-12-27')
    expect(getWeekStart(date('2027-01-02')).toString()).toBe('2026-12-27')
    expect(getWeekStart(date('2027-01-03')).toString()).toBe('2027-01-03')
  })
})

describe('getWeekDays', () => {
  test('should return the 7 days from Sunday to Saturday', () => {
    expect(
      getWeekDays(date('2026-12-27')).map((day) => day.toString()),
    ).toEqual([
      '2026-12-27',
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ])
  })
})

describe('getSchedulePath', () => {
  test('should point to the current week without a date', () => {
    expect(getSchedulePath()).toBe('/schedule')
  })

  test('should always point to the Sunday', () => {
    expect(getSchedulePath(date('2026-11-08'))).toBe('/schedule/2026-11-08')
    expect(getSchedulePath(date('2026-11-12'))).toBe('/schedule/2026-11-08')
    expect(getSchedulePath(date('2027-01-01'))).toBe('/schedule/2026-12-27')
  })
})

describe('getScheduleWeekRange', () => {
  const today = date('2026-11-12')

  test('should range from the week of the oldest video to 4 weeks later', () => {
    const range = getScheduleWeekRange({
      oldestDate: date('2024-03-14'),
      today,
    })

    expect(range.first.toString()).toBe('2024-03-10')
    expect(range.last.toString()).toBe('2026-12-06')
  })

  test('should start from the current week without any video', () => {
    expect(
      getScheduleWeekRange({ oldestDate: null, today }).first.toString(),
    ).toBe('2026-11-08')
  })

  test('should not start after the current week', () => {
    expect(
      getScheduleWeekRange({
        oldestDate: date('2026-11-20'),
        today,
      }).first.toString(),
    ).toBe('2026-11-08')
  })
})

describe('isWeekInRange', () => {
  const range = getScheduleWeekRange({
    oldestDate: date('2026-10-28'),
    today: date('2026-11-12'),
  })

  test('should accept the weeks from the first to the last', () => {
    expect(isWeekInRange(date('2026-10-25'), range)).toBe(true)
    expect(isWeekInRange(date('2026-11-08'), range)).toBe(true)
    expect(isWeekInRange(date('2026-12-06'), range)).toBe(true)
  })

  test('should reject the weeks before the oldest video and after 4 weeks', () => {
    expect(isWeekInRange(date('2026-10-18'), range)).toBe(false)
    expect(isWeekInRange(date('2026-12-13'), range)).toBe(false)
  })
})

describe('formatWeekRange', () => {
  test('should write the month of the last day', () => {
    expect(formatWeekRange(date('2026-11-08'))).toBe('2026年11月8日〜11月14日')
    expect(formatWeekRange(date('2026-11-29'))).toBe('2026年11月29日〜12月5日')
  })

  test('should write the year of the last day in another year', () => {
    expect(formatWeekRange(date('2026-12-27'))).toBe(
      '2026年12月27日〜2027年1月2日',
    )
  })

  test('should add the weekdays', () => {
    expect(formatWeekRange(date('2026-11-08'), { withWeekdays: true })).toBe(
      '2026年11月8日（日）〜11月14日（土）',
    )
  })
})

describe('getLengthMinutes', () => {
  test('should use the duration of an ended stream and a published video', () => {
    expect(
      getLengthMinutes({
        duration: 'PT1H30M0S',
        published_at: '2026-11-09T12:00:00Z',
        status: 'ENDED',
      }),
    ).toBe(90)
    expect(
      getLengthMinutes({
        duration: 'PT8M30S',
        published_at: '2026-11-09T12:00:00Z',
        status: 'PUBLISHED',
      }),
    ).toBe(8.5)
  })

  test('should use 1 hour for an upcoming or live stream', () => {
    for (const status of ['UPCOMING', 'LIVE']) {
      expect(
        getLengthMinutes({
          duration: 'PT3H',
          published_at: '2026-11-09T12:00:00Z',
          status,
        }),
      ).toBe(60)
    }
  })

  test('should use 1 hour without a duration', () => {
    expect(
      getLengthMinutes({
        duration: 'P0D',
        published_at: '2026-11-09T12:00:00Z',
        status: 'ENDED',
      }),
    ).toBe(60)
  })
})

describe('layoutDay', () => {
  // 21:00 on 9 November 2026 in Japan
  function video(
    id: string,
    time: string,
    duration = 'P0D',
    status = 'UPCOMING',
  ) {
    const [hour = 0, minute = 0] = time.split(':').map(Number)
    const publishedAt = Temporal.ZonedDateTime.from({
      day: 9,
      hour,
      minute,
      month: 11,
      timeZone: 'Asia/Tokyo',
      year: 2026,
    })
      .toInstant()
      .toString()

    return { duration, id, published_at: publishedAt, status }
  }

  function summarize(layouts: ScheduleLayout<ReturnType<typeof video>>[]) {
    return Object.fromEntries(
      layouts.map(({ column, columns, item, length, start }) => [
        item.id,
        { column, columns, length, start },
      ]),
    )
  }

  test('should place a video at its start with its length', () => {
    expect(
      summarize(layoutDay([video('a', '21:30', 'PT2H', 'ENDED')])),
    ).toEqual({
      a: { column: 0, columns: 1, length: 120, start: 21 * 60 + 30 },
    })
  })

  test('should draw a short video for 30 minutes at least', () => {
    expect(
      layoutDay([video('a', '12:00', 'PT5M', 'PUBLISHED')])[0]?.length,
    ).toBe(30)
  })

  test('should cut a video at the end of the day', () => {
    expect(layoutDay([video('a', '23:00', 'PT3H', 'ENDED')])[0]?.length).toBe(
      60,
    )
  })

  test('should cut a live stream at the end of the day', () => {
    // A live stream is drawn for an hour, so the part after 24:00 is cut
    expect(summarize(layoutDay([video('a', '23:30', 'P0D', 'LIVE')]))).toEqual({
      a: { column: 0, columns: 1, length: 30, start: 23 * 60 + 30 },
    })
    // Even shorter than `MIN_LENGTH_MINUTES`, as the day has no more room
    expect(layoutDay([video('a', '23:52', 'P0D', 'LIVE')])[0]?.length).toBe(8)
  })

  test('should draw a live stream for an hour until the end of the day', () => {
    expect(layoutDay([video('a', '23:00', 'P0D', 'LIVE')])[0]?.length).toBe(60)
    expect(layoutDay([video('a', '00:00', 'P0D', 'LIVE')])[0]).toMatchObject({
      length: 60,
      start: 0,
    })
  })

  test('should put the videos that overlap side by side', () => {
    expect(
      summarize(
        layoutDay([
          video('a', '18:00'),
          video('b', '18:00'),
          video('c', '18:30'),
          video('d', '20:00'),
        ]),
      ),
    ).toEqual({
      a: { column: 0, columns: 3, length: 60, start: 18 * 60 },
      b: { column: 1, columns: 3, length: 60, start: 18 * 60 },
      c: { column: 2, columns: 3, length: 60, start: 18 * 60 + 30 },
      // It does not overlap the others, so it has the whole width
      d: { column: 0, columns: 1, length: 60, start: 20 * 60 },
    })
  })

  test('should reuse a column that has become free', () => {
    expect(
      summarize(
        layoutDay([
          video('a', '18:00', 'PT3H', 'ENDED'),
          video('b', '18:00'),
          video('c', '19:00'),
        ]),
      ),
    ).toEqual({
      a: { column: 0, columns: 2, length: 180, start: 18 * 60 },
      b: { column: 1, columns: 2, length: 60, start: 18 * 60 },
      c: { column: 1, columns: 2, length: 60, start: 19 * 60 },
    })
  })
})
