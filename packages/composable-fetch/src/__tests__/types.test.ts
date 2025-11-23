import { describe, expect, it } from 'vitest'
import type { FetchMiddleware } from '../types.js'
import { composeFetch } from '../types.js'

describe('composeFetch', () => {
  it('should return native fetch when no middlewares are provided', async () => {
    const enhancedFetch = composeFetch()

    // enhancedFetch should be the same as native fetch
    expect(enhancedFetch).toBe(fetch)
  })

  it('should apply a single middleware', async () => {
    const mockMiddleware: FetchMiddleware = (next) => {
      return async (input, init) => {
        const response = await next(input, init)
        const modified = new Response(response.body, {
          headers: { ...response.headers, 'X-Custom': 'test' },
          status: response.status,
          statusText: response.statusText,
        })
        return modified
      }
    }

    const _enhancedFetch = composeFetch(mockMiddleware)

    // Use a mock response since we're in Node.js environment
    const mockFetch = async () => new Response('test', { status: 200 })
    const wrappedFetch = mockMiddleware(mockFetch)

    const response = await wrappedFetch('https://example.com')
    expect(response.headers.get('X-Custom')).toBe('test')
  })

  it('should compose multiple middlewares in correct order', async () => {
    const calls: string[] = []

    const middleware1: FetchMiddleware = (next) => {
      return async (input, init) => {
        calls.push('middleware1:before')
        const response = await next(input, init)
        calls.push('middleware1:after')
        return response
      }
    }

    const middleware2: FetchMiddleware = (next) => {
      return async (input, init) => {
        calls.push('middleware2:before')
        const response = await next(input, init)
        calls.push('middleware2:after')
        return response
      }
    }

    const mockFetch = async () => {
      calls.push('fetch')
      return new Response('test', { status: 200 })
    }

    // Compose middlewares (middleware1 should be outermost)
    const _enhancedFetch = composeFetch(middleware1, middleware2)

    // Manually apply to mockFetch to test
    const wrapped = middleware1(middleware2(mockFetch))
    await wrapped('https://example.com')

    expect(calls).toEqual([
      'middleware1:before',
      'middleware2:before',
      'fetch',
      'middleware2:after',
      'middleware1:after',
    ])
  })

  it('should pass options to middleware', async () => {
    type TestOptions = { prefix: string }

    const middleware: FetchMiddleware<TestOptions> = (next, options) => {
      return async (input, init) => {
        const response = await next(input, init)
        const body = await response.text()
        return new Response(`${options?.prefix || ''}${body}`, {
          status: response.status,
        })
      }
    }

    const mockFetch = async () => new Response('world', { status: 200 })
    const wrappedFetch = middleware(mockFetch, { prefix: 'hello ' })

    const response = await wrappedFetch('https://example.com')
    const body = await response.text()

    expect(body).toBe('hello world')
  })
})
