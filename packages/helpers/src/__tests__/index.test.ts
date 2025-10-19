import {
  createErrorResponse,
  isNonNullable,
  verifyCronRequest,
} from '../index.js'

describe('createErrorResponse', () => {
  it('should create an error response with default status 500', async () => {
    const response = createErrorResponse('Something went wrong', {})

    expect(response.status).toBe(500)
    expect(response.headers.get('Cache-Control')).toBe('no-store')

    const json = await response.json()
    expect(json).toEqual({ error: 'Something went wrong' })
  })

  it('should create an error response with custom status', async () => {
    const response = createErrorResponse('Not found', { status: 404 })

    expect(response.status).toBe(404)

    const json = await response.json()
    expect(json).toEqual({ error: 'Not found' })
  })

  it('should create an unauthorized response', async () => {
    const response = createErrorResponse('Unauthorized', { status: 401 })

    expect(response.status).toBe(401)

    const json = await response.json()
    expect(json).toEqual({ error: 'Unauthorized' })
  })
})

describe('isNonNullable', () => {
  it('should return true for non-null and non-undefined values', () => {
    expect(isNonNullable('test')).toBe(true)
    expect(isNonNullable(0)).toBe(true)
    expect(isNonNullable(false)).toBe(true)
    expect(isNonNullable([])).toBe(true)
    expect(isNonNullable({})).toBe(true)
  })

  it('should return false for null', () => {
    expect(isNonNullable(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isNonNullable(undefined)).toBe(false)
  })
})

describe('verifyCronRequest', () => {
  it('should return true when Authorization header matches', () => {
    const request = new Request('https://example.com', {
      headers: {
        Authorization: 'Bearer secret-token',
      },
    })

    const result = verifyCronRequest(request, { cronSecure: 'secret-token' })

    expect(result).toBe(true)
  })

  it('should return false when Authorization header is missing', () => {
    const request = new Request('https://example.com')

    const result = verifyCronRequest(request, { cronSecure: 'secret-token' })

    expect(result).toBe(false)
  })

  it('should return false when Authorization type is not Bearer', () => {
    const request = new Request('https://example.com', {
      headers: {
        Authorization: 'Basic secret-token',
      },
    })

    const result = verifyCronRequest(request, { cronSecure: 'secret-token' })

    expect(result).toBe(false)
  })

  it('should return false when credentials do not match', () => {
    const request = new Request('https://example.com', {
      headers: {
        Authorization: 'Bearer wrong-token',
      },
    })

    const result = verifyCronRequest(request, { cronSecure: 'secret-token' })

    expect(result).toBe(false)
  })

  it('should handle extra whitespace in Authorization header', () => {
    const request = new Request('https://example.com', {
      headers: {
        Authorization: '  Bearer   secret-token  ',
      },
    })

    const result = verifyCronRequest(request, { cronSecure: 'secret-token' })

    expect(result).toBe(true)
  })
})
