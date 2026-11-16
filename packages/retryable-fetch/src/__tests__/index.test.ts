import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import retryableFetch from '../index.js'

const URL = 'https://example.test/resource'

/** The sum of the default p-retry delays for 5 retries (1+2+4+8+16 s). */
const TOTAL_RETRY_DELAY_MS = 31_000

const fetchMock = vi.fn<typeof fetch>()

function respond(status: number, body = `status ${status}`): Response {
  return new Response(status === 304 ? null : body, { status })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('retryableFetch', () => {
  it('returns a successful response without retrying', async () => {
    fetchMock.mockResolvedValue(respond(200, 'ok'))

    const response = await retryableFetch(URL)

    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toBe('ok')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([304, 400, 401, 403, 404, 406, 409])(
    'returns a %i response without retrying',
    async (status) => {
      fetchMock.mockResolvedValue(respond(status))

      const response = await retryableFetch(URL)

      expect(response.status).toBe(status)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    },
  )

  it('returns the body of a 4xx response to the caller', async () => {
    const body = JSON.stringify({ code: 'PGRST116' })
    fetchMock.mockResolvedValue(respond(406, body))

    const response = await retryableFetch(URL)

    await expect(response.json()).resolves.toEqual({ code: 'PGRST116' })
  })

  it.each([408, 429, 500, 502, 503])(
    'retries a GET request that receives %i',
    async (status) => {
      fetchMock
        .mockResolvedValueOnce(respond(status))
        .mockResolvedValueOnce(respond(200, 'ok'))

      const promise = retryableFetch(URL)
      await vi.advanceTimersByTimeAsync(1_000)
      const response = await promise

      expect(response.status).toBe(200)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    },
  )

  it('returns the last 5xx response after 5 retries', async () => {
    fetchMock.mockImplementation(async () => respond(503, 'unavailable'))

    const promise = retryableFetch(URL)
    await vi.advanceTimersByTimeAsync(TOTAL_RETRY_DELAY_MS)
    const response = await promise

    expect(response.status).toBe(503)
    await expect(response.text()).resolves.toBe('unavailable')
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })

  it('retries a HEAD request that receives a 5xx response', async () => {
    fetchMock
      .mockResolvedValueOnce(respond(500))
      .mockResolvedValueOnce(respond(200))

    const promise = retryableFetch(URL, { method: 'head' })
    await vi.advanceTimersByTimeAsync(1_000)
    const response = await promise

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries when fetch fails with a network error', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(respond(200))

    const promise = retryableFetch(URL)
    await vi.advanceTimersByTimeAsync(1_000)
    const response = await promise

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws the last network error after 5 retries', async () => {
    fetchMock.mockImplementation(async () => {
      throw new TypeError('fetch failed')
    })

    const promise = retryableFetch(URL)
    const assertion = expect(promise).rejects.toThrow('fetch failed')
    await vi.advanceTimersByTimeAsync(TOTAL_RETRY_DELAY_MS)
    await assertion

    expect(fetchMock).toHaveBeenCalledTimes(6)
  })

  it.each([
    ['POST', 400],
    ['POST', 500],
    ['PATCH', 503],
    ['DELETE', 500],
  ] as const)(
    'sends a %s request once even when it receives %i',
    async (method, status) => {
      fetchMock.mockResolvedValue(respond(status))

      const response = await retryableFetch(URL, { method })

      expect(response.status).toBe(status)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    },
  )

  it('sends a POST request once even when fetch fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    await expect(retryableFetch(URL, { method: 'POST' })).rejects.toThrow(
      'fetch failed',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('uses the method of a Request object', async () => {
    fetchMock.mockResolvedValue(respond(500))

    const response = await retryableFetch(new Request(URL, { method: 'POST' }))

    expect(response.status).toBe(500)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('stops retrying when the signal is aborted', async () => {
    const controller = new AbortController()
    const reason = new Error('aborted by the caller')
    fetchMock.mockImplementation(async () => respond(503))

    const promise = retryableFetch(URL, { signal: controller.signal })
    const assertion = expect(promise).rejects.toBe(reason)
    await vi.advanceTimersByTimeAsync(1_000)
    controller.abort(reason)
    await vi.advanceTimersByTimeAsync(TOTAL_RETRY_DELAY_MS)
    await assertion

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not send a request when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      retryableFetch(URL, { signal: controller.signal }),
    ).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the signal of a Request object', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      retryableFetch(new Request(URL, { signal: controller.signal })),
    ).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ignores the signal of a Request object when init.signal is null', async () => {
    const controller = new AbortController()
    controller.abort()
    fetchMock.mockResolvedValue(respond(200))

    const response = await retryableFetch(
      new Request(URL, { signal: controller.signal }),
      { signal: null },
    )

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
