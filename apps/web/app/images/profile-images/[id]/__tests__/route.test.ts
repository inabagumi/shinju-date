// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const query = {
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    select: vi.fn(),
  }
  const adminClient = { from: vi.fn(), storage: {} }

  return {
    adminClient,
    publicClient: { from: vi.fn(() => query) },
    query,
    serveStorageImage: vi.fn(),
  }
})

vi.mock('@/lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => mocks.adminClient),
  supabaseClient: mocks.publicClient,
}))

vi.mock('@/lib/storage-image', () => ({
  serveStorageImage: mocks.serveStorageImage,
}))

import { GET } from '../route'

function get(id: string): Promise<Response> {
  return GET(
    new NextRequest(`https://shinju.date/images/profile-images/${id}`),
    {
      params: Promise.resolve({ id }),
    },
  )
}

describe('GET /images/profile-images/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.query.select.mockReturnValue(mocks.query)
    mocks.query.eq.mockReturnValue(mocks.query)
    mocks.serveStorageImage.mockResolvedValue(new Response('image'))
  })

  it('serves an icon the public may read from the profile-images bucket', async () => {
    mocks.query.maybeSingle.mockResolvedValue({
      data: { path: 'youtube/UC1/a.webp' },
      error: null,
    })

    const response = await get('image-1')

    expect(await response.text()).toBe('image')
    // The lookup goes through the public client, so RLS applies.
    expect(mocks.publicClient.from).toHaveBeenCalledWith('profile_images')
    expect(mocks.adminClient.from).not.toHaveBeenCalled()
    expect(mocks.query.eq).toHaveBeenCalledWith('id', 'image-1')
    expect(mocks.serveStorageImage).toHaveBeenCalledWith(expect.any(Request), {
      bucket: 'profile-images',
      path: 'youtube/UC1/a.webp',
      supabaseClient: mocks.adminClient,
    })
  })

  it('answers 404 for icons that are not in use', async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null })

    const response = await get('image-unused')

    expect(response.status).toBe(404)
    expect(mocks.serveStorageImage).not.toHaveBeenCalled()
  })

  it('answers 404 when the lookup fails', async () => {
    mocks.query.maybeSingle.mockResolvedValue({
      data: null,
      error: { code: '22P02', message: 'invalid input syntax for type uuid' },
    })

    const response = await get('not-a-uuid')

    expect(response.status).toBe(404)
    expect(mocks.serveStorageImage).not.toHaveBeenCalled()
  })
})
