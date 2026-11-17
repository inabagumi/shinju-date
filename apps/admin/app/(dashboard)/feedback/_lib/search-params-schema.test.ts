import { describe, expect, it } from 'vitest'
import { feedbackSearchParamsSchema } from './search-params-schema'

describe('feedbackSearchParamsSchema', () => {
  it('shows all requests when no parameters are given', () => {
    expect(feedbackSearchParamsSchema.parse({})).toEqual({
      read: undefined,
      status: undefined,
    })
  })

  it('parses valid parameters', () => {
    expect(
      feedbackSearchParamsSchema.parse({ read: 'unread', status: 'pending' }),
    ).toEqual({ read: 'unread', status: 'pending' })
  })

  it('shows all requests for invalid values', () => {
    expect(
      feedbackSearchParamsSchema.parse({ read: 'all', status: 'unknown' }),
    ).toEqual({ read: undefined, status: undefined })
  })

  it('uses the first value when a parameter is repeated', () => {
    expect(
      feedbackSearchParamsSchema.parse({
        read: ['read', 'unread'],
        status: ['resolved', 'pending'],
      }),
    ).toEqual({ read: 'read', status: 'resolved' })
  })
})
