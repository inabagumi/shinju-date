import { describe, expect, it, vi } from 'vitest'

import { withRetry } from '../with-retry.js'

describe('withRetry middleware', () => {
  it('should return response on successful request', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response('success', { status: 200 }))

    const retryFetch = withRetry(mockFetch)
    const response = await retryFetch('https://api.example.com/data')

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('success')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should not retry on 304 Not Modified', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 304 }))

    const retryFetch = withRetry(mockFetch)
    const response = await retryFetch('https://api.example.com/data')

    expect(response.status).toBe(304)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should retry failed requests', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('error', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      )
      .mockResolvedValueOnce(
        new Response('error', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      )
      .mockResolvedValueOnce(new Response('success', { status: 200 }))

    const retryFetch = withRetry(mockFetch, { retries: 3 })
    const response = await retryFetch('https://api.example.com/data')

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('success')
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('should abort retry on 404 by default', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response('not found', { status: 404, statusText: 'Not Found' }),
      )

    const retryFetch = withRetry(mockFetch)

    await expect(retryFetch('https://api.example.com/data')).rejects.toThrow(
      'Not Found',
    )

    // Should only be called once (no retries)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should retry on 404 when abortOn404 is false', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('not found', { status: 404, statusText: 'Not Found' }),
      )
      .mockResolvedValueOnce(
        new Response('not found', { status: 404, statusText: 'Not Found' }),
      )
      .mockResolvedValueOnce(new Response('success', { status: 200 }))

    const retryFetch = withRetry(mockFetch, { abortOn404: false, retries: 3 })
    const response = await retryFetch('https://api.example.com/data')

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('should exhaust retries and throw error', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response('error', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      ),
    )

    const retryFetch = withRetry(mockFetch, { retries: 2 })

    await expect(retryFetch('https://api.example.com/data')).rejects.toThrow(
      'Internal Server Error',
    )

    // Should be called 3 times total (1 initial + 2 retries)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('should consume response body on error', async () => {
    const mockArrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(0))
    const mockResponse = new Response('error', {
      status: 500,
      statusText: 'Internal Server Error',
    })
    mockResponse.arrayBuffer = mockArrayBuffer

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce(new Response('success', { status: 200 }))

    const retryFetch = withRetry(mockFetch)
    await retryFetch('https://api.example.com/data')

    // arrayBuffer should have been called to consume the body
    expect(mockArrayBuffer).toHaveBeenCalledTimes(1)
  })

  it('should use custom retry count', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response('error', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      ),
    )

    const retryFetch = withRetry(mockFetch, { retries: 1 })

    await expect(retryFetch('https://api.example.com/data')).rejects.toThrow()

    // Should be called 2 times total (1 initial + 1 retry)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should pass through request init options', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response('success', { status: 200 }))

    const retryFetch = withRetry(mockFetch)
    await retryFetch('https://api.example.com/data', {
      headers: { 'X-Custom': 'test' },
      method: 'POST',
    })

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', {
      headers: { 'X-Custom': 'test' },
      method: 'POST',
    })
  })
})
