import { TIME_ZONE } from '@shinju-date/constants'
import { Temporal } from 'temporal-polyfill'
import { describe, expect, it } from 'vitest'
import {
  analyticsSearchParamsSchema,
  getDefaultDateRange,
} from './search-params-schema'

describe('analyticsSearchParamsSchema', () => {
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()
  const yesterday = today.subtract({ days: 1 })
  const weekAgo = today.subtract({ days: 7 })

  it('should parse valid date range with from and to parameters', () => {
    const input = {
      from: weekAgo.toString(),
      to: yesterday.toString(),
    }

    const result = analyticsSearchParamsSchema.parse(input)

    expect(result).toEqual({
      dateRange: {
        endDate: yesterday.toString(),
        startDate: weekAgo.toString(),
      },
      selectedDate: null,
      tab: null,
    })
  })

  it('should parse single date parameter and create single-day range', () => {
    const input = {
      date: yesterday.toString(),
    }

    const result = analyticsSearchParamsSchema.parse(input)

    expect(result).toEqual({
      dateRange: {
        endDate: yesterday.toString(),
        startDate: yesterday.toString(),
      },
      selectedDate: yesterday.toString(),
      tab: null,
    })
  })

  it('should detect single-day range when from equals to', () => {
    const input = {
      from: yesterday.toString(),
      to: yesterday.toString(),
    }

    const result = analyticsSearchParamsSchema.parse(input)

    expect(result).toEqual({
      dateRange: {
        endDate: yesterday.toString(),
        startDate: yesterday.toString(),
      },
      selectedDate: yesterday.toString(),
      tab: null,
    })
  })

  it('should use default range when no parameters provided', () => {
    const input = {}
    const defaultRange = getDefaultDateRange()

    const result = analyticsSearchParamsSchema.parse(input)

    expect(result).toEqual({
      dateRange: defaultRange,
      selectedDate: null,
      tab: null,
    })
  })

  it('should handle array inputs by taking first element', () => {
    const input = {
      from: [weekAgo.toString(), 'ignored'],
      to: [yesterday.toString(), 'ignored'],
    }

    const result = analyticsSearchParamsSchema.parse(input)

    expect(result.dateRange.startDate).toBe(weekAgo.toString())
    expect(result.dateRange.endDate).toBe(yesterday.toString())
  })

  it('should reject future dates and fall back to default', () => {
    const futureDate = today.add({ days: 1 })
    const input = {
      date: futureDate.toString(),
    }

    const result = analyticsSearchParamsSchema.parse(input)
    const defaultRange = getDefaultDateRange()

    expect(result).toEqual({
      dateRange: defaultRange,
      selectedDate: null,
      tab: null,
    })
  })

  it('should reject dates older than 90 days and fall back to default', () => {
    const tooOldDate = today.subtract({ days: 91 })
    const input = {
      date: tooOldDate.toString(),
    }

    const result = analyticsSearchParamsSchema.parse(input)
    const defaultRange = getDefaultDateRange()

    expect(result).toEqual({
      dateRange: defaultRange,
      selectedDate: null,
      tab: null,
    })
  })

  it('should reject ranges where start date is after end date', () => {
    const input = {
      from: yesterday.toString(),
      to: weekAgo.toString(), // start > end
    }

    const result = analyticsSearchParamsSchema.parse(input)
    const defaultRange = getDefaultDateRange()

    expect(result).toEqual({
      dateRange: defaultRange,
      selectedDate: null,
      tab: null,
    })
  })

  it('should reject ranges longer than 90 days', () => {
    const endDate = today.subtract({ days: 1 })
    // Create a range > 90 days by using very old start date
    const tooLongStart = endDate.subtract({ days: 91 })

    const input = {
      from: tooLongStart.toString(),
      to: endDate.toString(),
    }

    const result = analyticsSearchParamsSchema.parse(input)
    const defaultRange = getDefaultDateRange()

    expect(result).toEqual({
      dateRange: defaultRange,
      selectedDate: null,
      tab: null,
    })
  })

  it('should reject invalid date formats', () => {
    const input = {
      date: 'invalid-date',
    }

    const result = analyticsSearchParamsSchema.parse(input)
    const defaultRange = getDefaultDateRange()

    expect(result).toEqual({
      dateRange: defaultRange,
      selectedDate: null,
      tab: null,
    })
  })

  it('should prioritize date parameter over from/to range', () => {
    const input = {
      date: today.subtract({ days: 2 }).toString(),
      from: weekAgo.toString(),
      to: yesterday.toString(),
    }

    const result = analyticsSearchParamsSchema.parse(input)

    expect(result).toEqual({
      dateRange: {
        endDate: today.subtract({ days: 2 }).toString(),
        startDate: today.subtract({ days: 2 }).toString(),
      },
      selectedDate: today.subtract({ days: 2 }).toString(),
      tab: null,
    })
  })

  it('should handle partial range parameters by falling back to default', () => {
    const input = {
      from: weekAgo.toString(),
      // Missing 'to' parameter
    }

    const result = analyticsSearchParamsSchema.parse(input)
    const defaultRange = getDefaultDateRange()

    expect(result).toEqual({
      dateRange: defaultRange,
      selectedDate: null,
      tab: null,
    })
  })

  it('should handle tab parameter correctly', () => {
    const input = {
      from: weekAgo.toString(),
      tab: 'channels',
      to: yesterday.toString(),
    }

    const result = analyticsSearchParamsSchema.parse(input)

    expect(result).toEqual({
      dateRange: {
        endDate: yesterday.toString(),
        startDate: weekAgo.toString(),
      },
      selectedDate: null,
      tab: 'channels',
    })
  })

  it('should handle tab parameter as array', () => {
    const input = {
      from: weekAgo.toString(),
      tab: ['videos', 'ignored'],
      to: yesterday.toString(),
    }

    const result = analyticsSearchParamsSchema.parse(input)

    expect(result).toEqual({
      dateRange: {
        endDate: yesterday.toString(),
        startDate: weekAgo.toString(),
      },
      selectedDate: null,
      tab: 'videos',
    })
  })
})

describe('getDefaultDateRange', () => {
  it('should return 7-day range ending today', () => {
    const result = getDefaultDateRange()
    const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()
    const expectedStart = today.subtract({ days: 6 })

    expect(result).toEqual({
      endDate: today.toString(),
      startDate: expectedStart.toString(),
    })
  })
})
