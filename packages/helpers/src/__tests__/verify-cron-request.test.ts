import { verifyCronRequest } from '../verify-cron-request.js'

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
