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
      endDate: '2026-11-10',
      limit: 50,
      range: { end: '2026-11-10', start: '2026-11-03' },
      selectedDate: null,
      startDate: '2026-11-03',
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
      endDate: null,
      limit: 50,
      range: { end: '2026-11-05', start: '2026-11-05' },
      selectedDate: '2026-11-05',
      startDate: '2026-11-05',
    })
  })

  it('exports a single day when only from is given', () => {
    expect(exportSearchParamsSchema.parse({ from: '2026-11-03' })).toEqual({
      endDate: null,
      limit: 50,
      range: { end: '2026-11-03', start: '2026-11-03' },
      selectedDate: '2026-11-03',
      startDate: '2026-11-03',
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

  it('rejects a start after the end', () => {
    expect(() =>
      exportSearchParamsSchema.parse({ from: '2026-11-10', to: '2026-11-03' }),
    ).toThrow('Start date must be before or equal to end date')
  })

  describe('compared with the schema of the analytics pages', () => {
    /** Whether the analytics pages show the given range instead of the default one */
    function isAcceptedByPage(from: string, to: string): boolean {
      const { dateRange } = analyticsSearchParamsSchema.parse({ from, to })

      return dateRange.startDate === from && dateRange.endDate === to
    }

    /** Whether the export covers the given range */
    function isAcceptedByExport(from: string, to: string): boolean {
      try {
        const result = exportSearchParamsSchema.parse({ from, to })

        return result.startDate === from && result.endDate === to
      } catch {
        return false
      }
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
