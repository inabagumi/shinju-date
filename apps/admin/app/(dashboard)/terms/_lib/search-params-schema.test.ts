import { describe, expect, it } from 'vitest'
import { termsSearchParamsSchema } from './search-params-schema'

describe('termsSearchParamsSchema', () => {
  it('has no search when no parameters are given', () => {
    expect(termsSearchParamsSchema.parse({})).toEqual({ search: undefined })
  })

  it('parses the search', () => {
    expect(termsSearchParamsSchema.parse({ search: ' ななし ' })).toEqual({
      search: 'ななし',
    })
  })

  it('has no search for a blank search', () => {
    expect(termsSearchParamsSchema.parse({ search: '  ' })).toEqual({
      search: undefined,
    })
  })

  it('uses the first value when the search is repeated', () => {
    expect(termsSearchParamsSchema.parse({ search: ['a', 'b'] })).toEqual({
      search: 'a',
    })
  })
})
