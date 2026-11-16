import { afterEach, describe, expect, test, vi } from 'vitest'
import { GET } from '../route'

describe('GET /opensearch.xml', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('uses the search results path that needs no redirect', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://shinju.date')

    const body = await GET().text()

    expect(body).toContain(
      'template="https://shinju.date/videos/{searchTerms}"',
    )
  })
})
