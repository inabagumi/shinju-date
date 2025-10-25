import { describe, expect, it } from 'vitest'
import { videoSearchParamsSchema } from './search-params-schema'

describe('videoSearchParamsSchema', () => {
  it('should parse valid parameters with all fields', () => {
    const input = {
      channelId: '123',
      deleted: 'false',
      page: '2',
      search: 'test video',
      sortField: 'published_at',
      sortOrder: 'asc',
      visible: 'true',
    }

    const result = videoSearchParamsSchema.parse(input)

    expect(result).toEqual({
      channelId: 123,
      deleted: false,
      page: 2,
      search: 'test video',
      sortField: 'published_at',
      sortOrder: 'asc',
      visible: true,
    })
  })

  it('should use default values when fields are missing', () => {
    const input = {}

    const result = videoSearchParamsSchema.parse(input)

    expect(result).toEqual({
      page: 1,
      sortField: 'updated_at',
      sortOrder: 'desc',
    })
  })

  it('should coerce page to number and apply minimum constraint', () => {
    const input = { page: '0' }

    const result = videoSearchParamsSchema.parse(input)

    expect(result.page).toBe(1) // Should be coerced to minimum of 1
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

    expect(result.sortField).toBe('updated_at') // Should fallback to default
  })

  it('should fallback to default for invalid sortOrder values', () => {
    const input = { sortOrder: 'invalid_order' }

    const result = videoSearchParamsSchema.parse(input)

    expect(result.sortOrder).toBe('desc') // Should fallback to default
  })

  it('should handle array inputs (URLSearchParams may provide arrays)', () => {
    const input = {
      channelId: ['456'],
      page: ['3'],
      search: ['multiple', 'values'], // Only first value should be used
    }

    const result = videoSearchParamsSchema.parse(input)

    expect(result.page).toBe(3)
    expect(result.channelId).toBe(456)
    // For string fields, zod should handle array by taking first value
  })

  it('should handle negative page numbers by using minimum constraint', () => {
    const input = { page: '-5' }

    const result = videoSearchParamsSchema.parse(input)

    expect(result.page).toBe(1) // Should be coerced to minimum of 1
  })

  it('should coerce channelId to number correctly', () => {
    const input = { channelId: '789' }

    const result = videoSearchParamsSchema.parse(input)

    expect(result.channelId).toBe(789)
  })

  it('should handle invalid channelId gracefully by returning undefined', () => {
    const input = { channelId: 'not-a-number' }

    const result = videoSearchParamsSchema.parse(input)

    expect(result.channelId).toBeUndefined() // Should return undefined for invalid values
  })

  it('should preserve optional fields when they are undefined', () => {
    const input = {
      page: '1',
      // Other fields intentionally missing
    }

    const result = videoSearchParamsSchema.parse(input)

    expect(result).toEqual({
      page: 1,
      sortField: 'updated_at',
      sortOrder: 'desc',
      // Optional fields should not be present
    })
    expect('search' in result).toBe(false)
    expect('channelId' in result).toBe(false)
    expect('visible' in result).toBe(false)
    expect('deleted' in result).toBe(false)
  })
})
