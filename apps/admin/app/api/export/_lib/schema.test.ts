import { TIME_ZONE } from '@shinju-date/constants'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analyticsSearchParamsSchema } from '../../../(dashboard)/analytics/_lib/search-params-schema'
import { exportSearchParamsSchema } from './schema'

describe('exportSearchParamsSchema', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(Temporal.Now, 'zonedDateTimeISO').mockReturnValue(
      Temporal.ZonedDateTime.from(`2026-11-14T12:00:00[${TIME_ZONE}]`),
    )
  })

  it('exports the range of from and to', () => {
    expect(
      exportSearchParamsSchema.parse({ from: '2026-11-03', to: '2026-11-10' }),
    ).toEqual({
      limit: 50,
      range: { end: '2026-11-10', start: '2026-11-03' },
      selectedDate: null,
    })
  })

  it('exports the single day of date, ahead of from and to', () => {
    expect(
      exportSearchParamsSchema.parse({
        date: '2026-11-05',
        from: '2026-11-03',
        to: '2026-11-10',
      }),
    ).toEqual({
      limit: 50,
      range: { end: '2026-11-05', start: '2026-11-05' },
      selectedDate: '2026-11-05',
    })
  })

  it('exports a single day when only from is given', () => {
    expect(exportSearchParamsSchema.parse({ from: '2026-11-03' })).toEqual({
      limit: 50,
      range: { end: '2026-11-03', start: '2026-11-03' },
      selectedDate: '2026-11-03',
    })
  })

  it('exports a single day when only to is given', () => {
    expect(exportSearchParamsSchema.parse({ to: '2026-11-03' })).toEqual({
      limit: 50,
      range: { end: '2026-11-03', start: '2026-11-03' },
      selectedDate: '2026-11-03',
    })
  })

  it('treats an empty date like a missing one', () => {
    expect(
      exportSearchParamsSchema.parse({ from: '', to: '2026-11-03' }),
    ).toEqual({
      limit: 50,
      range: { end: '2026-11-03', start: '2026-11-03' },
      selectedDate: '2026-11-03',
    })
  })

  it('clamps the limit', () => {
    expect(
      exportSearchParamsSchema.parse({ date: '2026-11-05', limit: '5000' })
        .limit,
    ).toBe(1000)
  })

  it('rejects a request without a date', () => {
    expect(exportSearchParamsSchema.safeParse({}).success).toBe(false)
  })

  it.each([
    ['is after today', '2026-11-15'],
    ['is before the window', '2026-08-16'],
    ['is not YYYY-MM-DD', '20261110'],
  ])('rejects a date that %s', (_, date) => {
    expect(exportSearchParamsSchema.safeParse({ date }).success).toBe(false)
  })

  it.each([
    ['from', { from: '2026-08-16', to: '2026-11-10' }],
    ['to', { from: '2026-11-01', to: '2026-11-15' }],
    ['date', { date: '2026-11-15', from: '2026-11-01', to: '2026-11-10' }],
    ['from', { date: '2026-11-05', from: '2026-08-16' }],
  ])('rejects %s outside the window instead of ignoring it', (key, params) => {
    const result = exportSearchParamsSchema.safeParse(params)

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path)).toContainEqual([
      key,
    ])
  })

  it('rejects a start after the end', () => {
    const result = exportSearchParamsSchema.safeParse({
      from: '2026-11-10',
      to: '2026-11-03',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toContain(
      'Start date must be before or equal to end date',
    )
  })

  it('rejects a range longer than 90 days', () => {
    // 2026-08-16 to 2026-11-14 is 91 days. A range this long always starts
    // before the window, which keeps the last 90 days
    expect(
      exportSearchParamsSchema.safeParse({
        from: '2026-08-16',
        to: '2026-11-14',
      }).success,
    ).toBe(false)
  })

  describe('compared with the schema of the analytics pages', () => {
    /** Whether the analytics pages show the given range instead of the default one */
    function isAcceptedByPage(from: string, to: string): boolean {
      const { dateRange } = analyticsSearchParamsSchema.parse({ from, to })

      return dateRange.startDate === from && dateRange.endDate === to
    }

    /** Whether the export covers the given range */
    function isAcceptedByExport(from: string, to: string): boolean {
      const result = exportSearchParamsSchema.safeParse({ from, to })

      return (
        result.success &&
        result.data.range.start === from &&
        result.data.range.end === to
      )
    }

    it.each([
      ['a range within the window', '2026-11-01', '2026-11-10', true],
      ['a single day', '2026-11-10', '2026-11-10', true],
      ['a range that ends today', '2026-11-01', '2026-11-14', true],
      ['the longest range', '2026-08-17', '2026-11-14', true],
      ['a range that ends tomorrow', '2026-11-01', '2026-11-15', false],
      [
        'a range that starts before the window',
        '2026-08-16',
        '2026-11-13',
        false,
      ],
      ['a reversed range', '2026-11-10', '2026-11-01', false],
      ['a start that is not YYYY-MM-DD', '20261101', '2026-11-10', false],
      [
        'an end that is not YYYY-MM-DD',
        '2026-11-01',
        '2026-11-10T00:00',
        false,
      ],
      ['a start that does not exist', '2026-09-31', '2026-11-10', false],
      ['an end that is not a date', '2026-11-01', 'invalid-date', false],
    ])('judges %s the same way', (_, from, to, expected) => {
      expect(isAcceptedByPage(from, to)).toBe(expected)
      expect(isAcceptedByExport(from, to)).toBe(expected)
    })

    it.each([
      ['a date within the window', '2026-11-10', true],
      ['today', '2026-11-14', true],
      ['the earliest date', '2026-08-17', true],
      ['tomorrow', '2026-11-15', false],
      ['a date before the window', '2026-08-16', false],
      ['a date that is not YYYY-MM-DD', '2026/11/10', false],
    ])('judges %s the same way', (_, date, expected) => {
      const page = analyticsSearchParamsSchema.parse({ date })
      const exported = exportSearchParamsSchema.safeParse({ date })

      expect(page.selectedDate === date).toBe(expected)
      expect(exported.success && exported.data.selectedDate === date).toBe(
        expected,
      )
    })
  })
})
