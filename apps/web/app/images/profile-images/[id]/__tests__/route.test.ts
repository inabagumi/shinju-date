import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const query = {
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    select: vi.fn(),
  }
  const storageBucket = {
    createSignedUrl: vi.fn(),
  }

  return {
    adminFrom: vi.fn(),
    publicFrom: vi.fn(() => query),
    query,
    storageBucket,
    storageFrom: vi.fn(() => storageBucket),
  }
})

vi.mock('@/lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({
    from: mocks.adminFrom,
    storage: { from: mocks.storageFrom },
  })),
  supabaseClient: {
    from: mocks.publicFrom,
  },
}))

import { GET } from '../route'

const IMAGE_ID = '15000000-0000-0000-0000-000000000001'
const SIGNED_URL =
  'https://fake.supabase.test/storage/v1/object/sign/profile-images/youtube/UC1/a.webp?token=x'

function callRoute() {
  return GET(
    new NextRequest(
      `https://shinju-date.test/images/profile-images/${IMAGE_ID}`,
    ),
    { params: Promise.resolve({ id: IMAGE_ID }) },
  )
}

describe('GET /images/profile-images/[id]', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)

    mocks.query.select.mockReturnValue(mocks.query)
    mocks.query.eq.mockReturnValue(mocks.query)
    mocks.storageBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: SIGNED_URL },
      error: null,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('serves the stored icon', async () => {
    mocks.query.maybeSingle.mockResolvedValue({
      data: { path: 'youtube/UC1/a.webp' },
      error: null,
    })
    fetchMock.mockResolvedValue(
      new Response('webp', {
        headers: { 'Content-Length': '4', 'Content-Type': 'image/webp' },
      }),
    )

    const response = await callRoute()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/webp')
    expect(await response.text()).toBe('webp')
    expect(mocks.query.eq).toHaveBeenCalledWith('id', IMAGE_ID)
    expect(mocks.storageFrom).toHaveBeenCalledWith('profile-images')
    expect(mocks.storageBucket.createSignedUrl).toHaveBeenCalledWith(
      'youtube/UC1/a.webp',
      expect.any(Number),
    )
  })

  it('reads the row with the public client so RLS applies', async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null })

    await callRoute()

    expect(mocks.publicFrom).toHaveBeenCalledWith('profile_images')
    expect(mocks.adminFrom).not.toHaveBeenCalled()
  })

  it('responds 404 for icons that may not be shown', async () => {
    // RLS hides icons of deleted talents, so the row is not found.
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null })

    const response = await callRoute()

    expect(response.status).toBe(404)
    expect(mocks.storageBucket.createSignedUrl).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('serves a placeholder when the stored object is missing', async () => {
    mocks.query.maybeSingle.mockResolvedValue({
      data: { path: 'youtube/UC1/a.webp' },
      error: null,
    })
    fetchMock.mockResolvedValue(new Response(null, { status: 400 }))

    const response = await callRoute()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
  })
})
