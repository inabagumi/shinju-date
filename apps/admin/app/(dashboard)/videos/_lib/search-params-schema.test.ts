import { describe, expect, it } from 'vitest'
import { DEFAULT_VALUES, videoSearchParamsSchema } from './search-params-schema'

describe('videoSearchParamsSchema', () => {
  it('should parse valid parameters with all fields', () => {
    const input = {
      deleted: 'false',
      page: '2',
      search: 'test video',
      sortField: 'published_at',
      sortOrder: 'asc',
      talentId: '201a9ee4-176f-4092-b769-ac0af8befb66',
      visible: 'true',
    }

    const result = videoSearchParamsSchema.parse(input)

    expect(result).toEqual({
      deleted: false,
      page: 2,
      search: 'test video',
      sortField: 'published_at',
      sortOrder: 'asc',
      talentId: '201a9ee4-176f-4092-b769-ac0af8befb66',
      visible: true,
    })
  })

  it('should use default values when fields are missing', () => {
    const input = {}

    const result = videoSearchParamsSchema.parse(input)

    expect(result).toEqual({
      page: DEFAULT_VALUES.page,
      sortField: DEFAULT_VALUES.sortField,
      sortOrder: DEFAULT_VALUES.sortOrder,
    })
  })

  it('should coerce page to number and apply minimum constraint', () => {
    const input = { page: '0' }

    const result = videoSearchParamsSchema.parse(input)

    expect(result.page).toBe(DEFAULT_VALUES.page) // Should be coerced to minimum of 1
  })

  it('should handle boolean transformation for visible field', () => {
    expect(videoSearchParamsSchema.parse({ visible: 'true' }).visible).toBe(
      true,
    )
    expect(videoSearchParamsSchema.parse({ visible: 'false' }).visible).toBe(
      false,
    )
    expect(
      videoSearchParamsSchema.parse({ visible: 'other' }).visible,
    ).toBeUndefined()
    expect(videoSearchParamsSchema.parse({}).visible).toBeUndefined()
  })

  it('should handle boolean transformation for deleted field', () => {
    expect(videoSearchParamsSchema.parse({ deleted: 'true' }).deleted).toBe(
      true,
    )
    expect(videoSearchParamsSchema.parse({ deleted: 'false' }).deleted).toBe(
      false,
    )
    expect(
      videoSearchParamsSchema.parse({ deleted: 'other' }).deleted,
    ).toBeUndefined()
    expect(videoSearchParamsSchema.parse({}).deleted).toBeUndefined()
  })

  it('should fallback to default for invalid sortField values', () => {
    const input = { sortField: 'invalid_field' }

    const result = videoSearchParamsSchema.parse(input)

    expect(result.sortField).toBe(DEFAULT_VALUES.sortField) // Should fallback to default
  })

  it('should fallback to default for invalid sortOrder values', () => {
    const input = { sortOrder: 'invalid_order' }

    const result = videoSearchParamsSchema.parse(input)

    expect(result.sortOrder).toBe(DEFAULT_VALUES.sortOrder) // Should fallback to default
  })

  it('should handle array inputs (URLSearchParams may provide arrays)', () => {
    const input = {
      page: ['3'],
      search: ['multiple', 'values'], // Only first value should be used
      talentId: ['3de58e38-8314-41c1-a75a-c1658dae6d5a'],
    }

    const result = videoSearchParamsSchema.parse(input)

    expect(result.page).toBe(3)
    expect(result.talentId).toBe('3de58e38-8314-41c1-a75a-c1658dae6d5a')
    // For string fields, zod should handle array by taking first value
  })

  it('should handle negative page numbers by using minimum constraint', () => {
    const input = { page: '-5' }

    const result = videoSearchParamsSchema.parse(input)

    expect(result.page).toBe(DEFAULT_VALUES.page) // Should be coerced to minimum of 1
  })

  it('should coerce talentId to number correctly', () => {
    const input = { talentId: '319cb587-3b05-44d0-8ed6-2307a07e1817' }

    const result = videoSearchParamsSchema.parse(input)

    expect(result.talentId).toBe('319cb587-3b05-44d0-8ed6-2307a07e1817')
  })

  it('should preserve optional fields when they are undefined', () => {
    const input = {
      page: '1',
      // Other fields intentionally missing
    }

    const result = videoSearchParamsSchema.parse(input)

    expect(result).toEqual({
      page: DEFAULT_VALUES.page,
      sortField: DEFAULT_VALUES.sortField,
      sortOrder: DEFAULT_VALUES.sortOrder,
      // Optional fields should not be present
    })
    expect('search' in result).toBe(false)
    expect('talentId' in result).toBe(false)
    expect('visible' in result).toBe(false)
    expect('deleted' in result).toBe(false)
  })
})
