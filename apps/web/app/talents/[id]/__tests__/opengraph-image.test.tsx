// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { TalentDetail } from '@/lib/fetchers'

const mocks = vi.hoisted(() => ({
  fetchTalent: vi.fn(),
  fetchTalentIconDataURL: vi.fn(),
}))

vi.mock('@/lib/fetchers', () => ({
  fetchTalent: mocks.fetchTalent,
}))

vi.mock('../_lib/og-image', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchTalentIconDataURL: mocks.fetchTalentIconDataURL,
}))

vi.mock('@/lib/supabase', () => ({
  createSupabaseClient: vi.fn(),
  supabaseClient: {},
}))

import Image, { contentType, size } from '../opengraph-image'

const TALENT_ID = '00000000-0000-4000-8000-000000000001'

// The name is in ASCII, so that no fonts are fetched for it in the tests
function createTalent(overrides: Partial<TalentDetail> = {}): TalentDetail {
  return {
    id: TALENT_ID,
    name: 'Mio Asagiri',
    theme_color: '#FF6B9D',
    twitch_users: [],
    youtube_channels: [
      {
        name: 'Mio Asagiri',
        profile_image: { blur_data_url: '', id: 'icon-1' },
        youtube_channel_id: 'UC1',
        youtube_handle: '@mio',
      },
    ],
    ...overrides,
  }
}

function render(id = TALENT_ID): Promise<Response> {
  return Image({ params: Promise.resolve({ id }) })
}

/** The width and height in the IHDR chunk of a PNG */
function getPNGSize(buffer: ArrayBuffer) {
  const view = new DataView(buffer)

  return { height: view.getUint32(20), width: view.getUint32(16) }
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

// A 1x1 PNG
const ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='

describe('opengraph-image of a talent', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.fetchTalent.mockResolvedValue(createTalent())
    mocks.fetchTalentIconDataURL.mockResolvedValue(ICON_DATA_URL)
  })

  test('should be a 1200x630 PNG', async () => {
    const response = await render()

    expect(contentType).toBe('image/png')
    expect(size).toEqual({ height: 630, width: 1200 })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')

    const body = await response.arrayBuffer()

    expect([...new Uint8Array(body.slice(0, 8))]).toEqual(PNG_SIGNATURE)
    expect(getPNGSize(body)).toEqual({ height: 630, width: 1200 })
    expect(mocks.fetchTalent).toHaveBeenCalledWith(TALENT_ID)
    expect(mocks.fetchTalentIconDataURL).toHaveBeenCalledWith(
      { blur_data_url: '', id: 'icon-1' },
      320,
    )
  })

  test('should not be cached as immutable', async () => {
    const response = await render()

    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=3600, s-maxage=86400',
    )
  })

  test('should be generated without a theme color or an icon', async () => {
    mocks.fetchTalent.mockResolvedValue(
      createTalent({ theme_color: null, youtube_channels: [] }),
    )
    mocks.fetchTalentIconDataURL.mockResolvedValue(null)

    const response = await render()

    expect(response.status).toBe(200)
    expect(getPNGSize(await response.arrayBuffer())).toEqual({
      height: 630,
      width: 1200,
    })
    expect(mocks.fetchTalentIconDataURL).toHaveBeenCalledWith(null, 320)
  })

  test('should be not found for talents that are not shown', async () => {
    mocks.fetchTalent.mockResolvedValue(null)

    await expect(render('not-a-uuid')).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(mocks.fetchTalentIconDataURL).not.toHaveBeenCalled()
  })
})
