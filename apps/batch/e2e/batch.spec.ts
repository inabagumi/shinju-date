import { expect, test } from '@playwright/test'

test.describe('Batch App - Health Checks', () => {
  test('should respond to health check endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:5000/api/healthz')

    // Should return 200 OK
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    // Check response body
    const body = await response.json()
    expect(body).toBeDefined()
  })

  test('should respond to readiness check endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:5000/api/readyz', {
      failOnStatusCode: false,
    })

    // Should not return 404 (endpoint exists)
    expect(response.status()).not.toBe(404)

    // May return 200, 500, or 503 depending on readiness state
    expect([200, 500, 503]).toContain(response.status())
  })
})

test.describe('Batch App - API Endpoints', () => {
  test('should have videos update endpoint', async ({ request }) => {
    // Note: This endpoint likely requires authentication or specific headers
    // We're just checking that it exists and returns a proper response
    const response = await request.post('http://localhost:5000/videos/update', {
      failOnStatusCode: false,
    })

    // Should not return 404 (endpoint exists)
    expect(response.status()).not.toBe(404)

    // May return 401 (unauthorized), 400 (bad request), 204 (no content), or 500 (error) which is expected
    // The important thing is that the endpoint is reachable
    expect([200, 204, 400, 401, 403, 500]).toContain(response.status())
  })

  test('should have videos check endpoint', async ({ request }) => {
    const response = await request.post('http://localhost:5000/videos/check', {
      failOnStatusCode: false,
    })

    // Should not return 404 (endpoint exists)
    expect(response.status()).not.toBe(404)

    // May return 401 (unauthorized) or 400 (bad request) which is expected
    expect([200, 204, 400, 401, 403, 500]).toContain(response.status())
  })

  test('should have talents update endpoint', async ({ request }) => {
    const response = await request.post(
      'http://localhost:5000/talents/update',
      {
        failOnStatusCode: false,
      },
    )

    // Should not return 404 (endpoint exists)
    expect(response.status()).not.toBe(404)

    // May return 401 (unauthorized) or 400 (bad request) which is expected
    expect([200, 204, 400, 401, 403, 500]).toContain(response.status())
  })

  test('should have recommendation queries update endpoint', async ({
    request,
  }) => {
    const response = await request.post(
      'http://localhost:5000/recommendation/queries/update',
      {
        failOnStatusCode: false,
      },
    )

    // Should not return 404 (endpoint exists)
    expect(response.status()).not.toBe(404)

    // May return 401 (unauthorized) or 400 (bad request) which is expected
    expect([200, 204, 400, 401, 403, 500]).toContain(response.status())
  })

  test('should have stats snapshot endpoint', async ({ request }) => {
    const response = await request.post(
      'http://localhost:5000/stats/snapshot',
      {
        failOnStatusCode: false,
      },
    )

    // Should not return 404 (endpoint exists)
    expect(response.status()).not.toBe(404)

    // May return 401 (unauthorized) or 400 (bad request) which is expected
    expect([200, 204, 400, 401, 403, 500]).toContain(response.status())
  })
})

test.describe('Batch App - Error Handling', () => {
  test('should handle non-existent routes', async ({ request }) => {
    const response = await request.get(
      'http://localhost:5000/api/non-existent',
      {
        failOnStatusCode: false,
      },
    )

    // Should return 404 for non-existent routes
    expect(response.status()).toBe(404)
  })
})
