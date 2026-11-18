import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { providerQuerySchema } from './provider'
import { parseQuery } from './query'

function createRequest(search = ''): Request {
  return new Request(`http://localhost:5000/talents/update${search}`)
}

describe('parseQuery', () => {
  it('returns YouTube when provider is omitted', () => {
    expect(parseQuery(providerQuerySchema, createRequest())).toEqual({
      provider: 'youtube',
    })
  })

  it('returns the parsed query', () => {
    expect(
      parseQuery(providerQuerySchema, createRequest('?provider=twitch')),
    ).toEqual({ provider: 'twitch' })
  })

  it('answers 400 naming the invalid parameter', async () => {
    const response = parseQuery(
      providerQuerySchema,
      createRequest('?provider=niconico'),
    )

    expect(response).toBeInstanceOf(Response)

    const { headers, status } = response as Response

    expect(status).toBe(400)
    expect(headers.get('Cache-Control')).toBe('no-store')
    await expect((response as Response).json()).resolves.toEqual({
      error: expect.stringMatching(
        /^Invalid query parameters\. provider: .*"youtube".*"twitch"/,
      ),
    })
  })

  it('names every invalid parameter', async () => {
    const schema = providerQuerySchema.extend({
      mode: z.enum(['recent', 'all']).optional(),
    })
    const response = parseQuery(
      schema,
      createRequest('?provider=niconico&mode=everything'),
    ) as Response
    const { error } = await response.json()

    expect(error).toMatch(/provider: /)
    expect(error).toMatch(/mode: /)
  })
})
