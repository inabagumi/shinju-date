import { describe, expect, it } from 'vitest'
import { talentSearchParamsSchema } from './search-params-schema'

describe('talentSearchParamsSchema', () => {
  it('uses the default values when no parameters are given', () => {
    expect(talentSearchParamsSchema.parse({})).toEqual({
      search: undefined,
      sort: 'desc',
      status: 'not_deleted',
    })
  })

  it('parses valid parameters', () => {
    expect(
      talentSearchParamsSchema.parse({
        search: 'ななし',
        sort: 'asc',
        status: 'retired',
      }),
    ).toEqual({ search: 'ななし', sort: 'asc', status: 'retired' })
  })

  it('uses the default values for invalid values', () => {
    expect(
      talentSearchParamsSchema.parse({ sort: 'random', status: 'unknown' }),
    ).toEqual({ search: undefined, sort: 'desc', status: 'not_deleted' })
  })

  it('treats a blank search as no search and trims the search', () => {
    expect(talentSearchParamsSchema.parse({ search: '   ' }).search).toBe(
      undefined,
    )
    expect(talentSearchParamsSchema.parse({ search: ' abc ' }).search).toBe(
      'abc',
    )
  })

  it('uses the first value when a parameter is repeated', () => {
    expect(
      talentSearchParamsSchema.parse({
        search: ['a', 'b'],
        sort: ['asc', 'desc'],
        status: ['deleted', 'all'],
      }),
    ).toEqual({ search: 'a', sort: 'asc', status: 'deleted' })
  })
})
