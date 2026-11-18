// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  createProfileImage,
  createTalent,
  createYouTubeChannel,
} from '@/test/factories'
import { seedSupabase, setupSupabase, supabaseRequests } from '@/test/supabase'

// Vitest does not run `'use cache'`, so `fetchTalent` queries every time
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}))

import Image, { contentType, size } from './opengraph-image'

setupSupabase()

// The name is in ASCII, so that no fonts are fetched for it in the tests
const TALENT = createTalent({ name: 'Mio Asagiri', theme_color: '#FF6B9D' })
const ICON = createProfileImage({ path: 'youtube/UC1/a.webp' })
const CHANNEL = createYouTubeChannel({
  name: 'Mio Asagiri',
  profile_image_id: ICON.id,
  talent_id: TALENT.id,
  youtube_channel_id: 'UC1',
  youtube_handle: '@mio',
})

function render(id = TALENT.id): Promise<Response> {
  return Image({ params: Promise.resolve({ id }) })
}

/** The width and height in the IHDR chunk of a PNG */
function getPNGSize(buffer: ArrayBuffer) {
  const view = new DataView(buffer)

  return { height: view.getUint32(20), width: view.getUint32(16) }
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

describe('opengraph-image of a talent', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    await seedSupabase({
      profileImages: [ICON],
      talents: [TALENT],
      youtubeChannels: [CHANNEL],
    })
  })

  test('should be a 1200x630 PNG with the icon of the talent', async () => {
    const response = await render()

    expect(contentType).toBe('image/png')
    expect(size).toEqual({ height: 630, width: 1200 })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')

    const body = await response.arrayBuffer()

    expect([...new Uint8Array(body.slice(0, 8))]).toEqual(PNG_SIGNATURE)
    expect(getPNGSize(body)).toEqual({ height: 630, width: 1200 })
    // The icon of the channel is looked up to be drawn
    expect(
      supabaseRequests('profile_images').map(({ url }) =>
        url.searchParams.get('id'),
      ),
    ).toEqual([`eq.${ICON.id}`])
  })

  test('should not be cached as immutable', async () => {
    const response = await render()

    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=3600, s-maxage=86400',
    )
  })

  test('should be generated without a theme color or an icon', async () => {
    await seedSupabase({ talents: [{ ...TALENT, theme_color: null }] })

    const response = await render()

    expect(response.status).toBe(200)
    expect(getPNGSize(await response.arrayBuffer())).toEqual({
      height: 630,
      width: 1200,
    })
    expect(supabaseRequests('profile_images')).toEqual([])
  })

  test.each([
    ['an ID that is not a UUID', 'not-a-uuid'],
    ['a talent that does not exist', crypto.randomUUID()],
  ])('should be not found for %s', async (_, id) => {
    await expect(render(id)).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(supabaseRequests('profile_images')).toEqual([])
  })
})
