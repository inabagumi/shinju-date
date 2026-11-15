import { expect, test } from '@playwright/test'

const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3000'

// Provided by the MSW mock data (packages/msw-handlers).
const TALENT_ID = '00000000-0000-4000-8000-000000000001'
const MISSING_TALENT_ID = '00000000-0000-4000-8000-0000000000ff'

test.describe('Talent calendar', () => {
  test('should serve the calendar of a talent at /talents/[id].ics', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/talents/${TALENT_ID}.ics`)

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe(
      'text/calendar; charset=UTF-8',
    )

    const body = await response.text()

    expect(body).toMatch(/^BEGIN:VCALENDAR\r?\n/)
    expect(body).toContain('BEGIN:VEVENT')
  })

  test('should answer 404 for a talent that does not exist', async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE_URL}/talents/${MISSING_TALENT_ID}.ics`,
    )

    expect(response.status()).toBe(404)
  })

  test('should redirect the old path permanently', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/channels/${TALENT_ID}/videos.ics`,
      { maxRedirects: 0 },
    )

    expect(response.status()).toBe(308)
    expect(
      new URL(response.headers()['location'] ?? '', BASE_URL).pathname,
    ).toBe(`/talents/${TALENT_ID}.ics`)

    const redirected = await request.get(
      `${BASE_URL}/channels/${TALENT_ID}/videos.ics`,
    )

    expect(redirected.url()).toBe(`${BASE_URL}/talents/${TALENT_ID}.ics`)
    expect(redirected.status()).toBe(200)
    expect(redirected.headers()['content-type']).toBe(
      'text/calendar; charset=UTF-8',
    )
  })
})
