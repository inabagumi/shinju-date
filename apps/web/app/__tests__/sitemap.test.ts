import { describe, expect, test, vi } from 'vitest'

vi.mock('@/lib/fetchers', () => ({
  fetchActiveTalents: vi.fn().mockResolvedValue([
    { id: '00000000-0000-4000-8000-000000000001', name: '朝霧ミオ' },
    { id: '00000000-0000-4000-8000-000000000002', name: '風花リツ' },
  ]),
}))

import sitemap from '../sitemap'

describe('sitemap', () => {
  test('should include the talent list and the pages of active talents', async () => {
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://shinju.date')

    const urls = (await sitemap()).map((item) => item.url)

    expect(urls).toEqual(
      expect.arrayContaining([
        'https://shinju.date/talents',
        'https://shinju.date/talents/00000000-0000-4000-8000-000000000001',
        'https://shinju.date/talents/00000000-0000-4000-8000-000000000002',
      ]),
    )

    vi.unstubAllEnvs()
  })
})
