// @vitest-environment node
import { SITE_THEME_COLOR } from '@shinju-date/constants'
import sharp from 'sharp'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const query = {
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    select: vi.fn(),
  }
  const bucket = { download: vi.fn() }
  const adminClient = { storage: { from: vi.fn(() => bucket) } }

  return {
    adminClient,
    bucket,
    publicClient: { from: vi.fn(() => query) },
    query,
  }
})

vi.mock('@/lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => mocks.adminClient),
  supabaseClient: mocks.publicClient,
}))

vi.mock('@shinju-date/logger', () => ({
  logger: { warn: vi.fn() },
}))

import { fetchTalentIconDataURL, getTalentThemeColor } from '../og-image'

const PROFILE_IMAGE = { blur_data_url: '', id: 'icon-1' }

describe('getTalentThemeColor', () => {
  test('should use the theme color of the talent', () => {
    expect(getTalentThemeColor('#FF6B9D')).toBe('#FF6B9D')
    expect(getTalentThemeColor('#87ceeb')).toBe('#87ceeb')
  })

  test('should use the site theme color without a theme color', () => {
    expect(getTalentThemeColor(null)).toBe(SITE_THEME_COLOR)
    expect(getTalentThemeColor(undefined)).toBe(SITE_THEME_COLOR)
    expect(getTalentThemeColor('')).toBe(SITE_THEME_COLOR)
  })

  test('should use the site theme color for values that are not #rrggbb', () => {
    for (const value of [
      '#fff',
      '#ff6b9d80',
      'FF6B9D',
      'red',
      '#GGGGGG',
      ' #FF6B9D',
      '#FF6B9D\n',
      'rgb(255, 0, 0)',
      'url(https://example.com)',
    ]) {
      expect(getTalentThemeColor(value)).toBe(SITE_THEME_COLOR)
    }
  })
})

describe('fetchTalentIconDataURL', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.query.select.mockReturnValue(mocks.query)
    mocks.query.eq.mockReturnValue(mocks.query)
    mocks.query.maybeSingle.mockResolvedValue({
      data: { path: 'youtube/UC1/a.webp' },
      error: null,
    })
  })

  test('should convert the icon to a PNG of the given size', async () => {
    const webp = await sharp({
      create: {
        background: '#ff0000',
        channels: 3,
        height: 64,
        width: 64,
      },
    })
      .webp()
      .toBuffer()

    mocks.bucket.download.mockResolvedValue({
      data: new Blob([new Uint8Array(webp)], { type: 'image/webp' }),
      error: null,
    })

    const dataURL = await fetchTalentIconDataURL(PROFILE_IMAGE, 320)

    expect(dataURL).toMatch(/^data:image\/png;base64,/)
    // The lookup goes through the public client, so RLS applies.
    expect(mocks.publicClient.from).toHaveBeenCalledWith('profile_images')
    expect(mocks.query.eq).toHaveBeenCalledWith('id', 'icon-1')
    expect(mocks.adminClient.storage.from).toHaveBeenCalledWith(
      'profile-images',
    )
    expect(mocks.bucket.download).toHaveBeenCalledWith('youtube/UC1/a.webp')

    const png = Buffer.from(
      (dataURL ?? '').replace('data:image/png;base64,', ''),
      'base64',
    )

    await expect(sharp(png).metadata()).resolves.toMatchObject({
      format: 'png',
      height: 320,
      width: 320,
    })
  })

  test('should return null for a talent without an icon', async () => {
    await expect(fetchTalentIconDataURL(null, 320)).resolves.toBeNull()

    expect(mocks.publicClient.from).not.toHaveBeenCalled()
  })

  test('should return null for an icon that may not be used', async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null })

    await expect(fetchTalentIconDataURL(PROFILE_IMAGE, 320)).resolves.toBeNull()

    expect(mocks.bucket.download).not.toHaveBeenCalled()
  })

  test('should return null when the lookup fails', async () => {
    mocks.query.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'failed' },
    })

    await expect(fetchTalentIconDataURL(PROFILE_IMAGE, 320)).resolves.toBeNull()
  })

  test('should return null when the download fails', async () => {
    mocks.bucket.download.mockResolvedValue({
      data: null,
      error: new Error('Object not found'),
    })

    await expect(fetchTalentIconDataURL(PROFILE_IMAGE, 320)).resolves.toBeNull()
  })

  test('should return null for an icon that cannot be converted', async () => {
    mocks.bucket.download.mockResolvedValue({
      data: new Blob(['not an image']),
      error: null,
    })

    await expect(fetchTalentIconDataURL(PROFILE_IMAGE, 320)).resolves.toBeNull()
  })
})
