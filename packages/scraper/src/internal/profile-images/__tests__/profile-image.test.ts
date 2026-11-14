import { HttpResponse, http } from 'msw'
import sharp from 'sharp'
import { Temporal } from 'temporal-polyfill'
import { beforeAll, describe, expect, it } from 'vitest'
import { postgresError, setupSupabase } from '../../testing/supabase.js'
import {
  type ProfileImage,
  type ProfileImageOwner,
  removeProfileImage,
  syncProfileImage,
} from '../profile-image.js'

const supabase = setupSupabase()

const SOURCE_URL = 'https://images.test/icon.png'
const STORAGE_URL =
  'https://fake.supabase.test/storage/v1/object/profile-images'
const now = Temporal.Instant.from('2024-05-01T12:34:56.789Z')
const owner: ProfileImageOwner = {
  id: 'channel-row-1',
  platform: 'youtube',
  platformId: 'UC123',
}
const current: ProfileImage = {
  etag: '"etag-1"',
  id: 'image-1',
  path: 'youtube/UC123/old.webp',
}

/** A wide image, to check that stored icons are cropped to a square. */
let wideImage: Buffer

beforeAll(async () => {
  wideImage = await sharp({
    create: {
      background: { b: 0, g: 0, r: 255 },
      channels: 4,
      height: 400,
      width: 600,
    },
  })
    .png()
    .toBuffer()
})

interface StorageCalls {
  removed: unknown[]
  requestHeaders: Headers[]
  uploads: { body: Buffer; path: string }[]
}

interface MockOptions {
  contentType?: string
  etag?: string | null
  status?: 200 | 304
}

function mockSourceAndStorage({
  contentType = 'image/png',
  etag = '"etag-2"',
  status = 200,
}: MockOptions = {}): StorageCalls {
  const calls: StorageCalls = { removed: [], requestHeaders: [], uploads: [] }

  supabase.server.use(
    http.get(SOURCE_URL, ({ request }) => {
      calls.requestHeaders.push(request.headers)

      if (status === 304) {
        return new HttpResponse(null, { status: 304 })
      }

      return HttpResponse.arrayBuffer(new Uint8Array(wideImage).buffer, {
        headers: {
          'Content-Type': contentType,
          ...(etag ? { ETag: etag } : {}),
        },
      })
    }),
    http.post(`${STORAGE_URL}/*`, async ({ request }) => {
      calls.uploads.push({
        body: Buffer.from(await request.arrayBuffer()),
        path: new URL(request.url).pathname.replace(
          '/storage/v1/object/profile-images/',
          '',
        ),
      })

      return HttpResponse.json({ Key: 'profile-images/x' })
    }),
    http.delete(STORAGE_URL, async ({ request }) => {
      calls.removed.push(await request.json())

      return HttpResponse.json([])
    }),
  )

  return calls
}

describe('syncProfileImage', () => {
  it('stores a square icon for an account without one', async () => {
    const calls = mockSourceAndStorage()
    supabase.respond(() => [])

    const result = await syncProfileImage({
      current: null,
      now,
      owner,
      sourceUrl: SOURCE_URL,
      supabaseClient: supabase.supabaseClient,
    })

    expect(result.status).toBe('created')
    expect(result.image.path).toMatch(/^youtube\/UC123\/[\w-]+\.webp$/)
    expect(calls.requestHeaders[0]?.has('If-None-Match')).toBe(false)
    expect(calls.uploads).toHaveLength(1)
    expect(calls.uploads[0]?.path).toBe(result.image.path)

    const stored = await sharp(calls.uploads[0]?.body).metadata()

    expect(stored).toMatchObject({ format: 'webp', height: 256, width: 256 })
    expect(supabase.written('POST', 'profile_images')[0]?.body).toEqual({
      blur_data_url: expect.stringMatching(/^data:image\/webp;base64,/),
      etag: '"etag-2"',
      height: 256,
      id: result.image.id,
      path: result.image.path,
      twitch_user_id: null,
      updated_at: '2024-05-01T12:34:56Z',
      width: 256,
      youtube_channel_id: 'channel-row-1',
    })
  })

  it('links a Twitch icon to the Twitch user', async () => {
    mockSourceAndStorage()
    supabase.respond(() => [])

    const result = await syncProfileImage({
      current: null,
      now,
      owner: { id: 'twitch-row-1', platform: 'twitch', platformId: '1001' },
      sourceUrl: SOURCE_URL,
      supabaseClient: supabase.supabaseClient,
    })

    expect(result.image.path).toMatch(/^twitch\/1001\//)
    expect(supabase.written('POST', 'profile_images')[0]?.body).toMatchObject({
      twitch_user_id: 'twitch-row-1',
      youtube_channel_id: null,
    })
  })

  it('does not enlarge icons smaller than the stored size', async () => {
    const small = await sharp({
      create: {
        background: { b: 255, g: 0, r: 0 },
        channels: 3,
        height: 88,
        width: 120,
      },
    })
      .jpeg()
      .toBuffer()
    const calls = mockSourceAndStorage()
    supabase.server.use(
      http.get(SOURCE_URL, () =>
        HttpResponse.arrayBuffer(new Uint8Array(small).buffer, {
          headers: { 'Content-Type': 'image/jpeg' },
        }),
      ),
    )
    supabase.respond(() => [])

    await syncProfileImage({
      current: null,
      now,
      owner,
      sourceUrl: SOURCE_URL,
      supabaseClient: supabase.supabaseClient,
    })

    const stored = await sharp(calls.uploads[0]?.body).metadata()

    expect(stored).toMatchObject({ height: 88, width: 88 })
    expect(supabase.written('POST', 'profile_images')[0]?.body).toMatchObject({
      // No ETag from the source: a digest of the image stands in for it.
      etag: expect.stringMatching(/^W\/"sha256-[0-9a-f]{64}"$/),
      height: 88,
      width: 88,
    })
  })

  it('skips an icon the source reports as not modified', async () => {
    const calls = mockSourceAndStorage({ status: 304 })
    supabase.respond(() => [])

    const result = await syncProfileImage({
      current,
      now,
      owner,
      sourceUrl: SOURCE_URL,
      supabaseClient: supabase.supabaseClient,
    })

    expect(result).toEqual({ image: current, status: 'unchanged' })
    expect(calls.requestHeaders[0]?.get('If-None-Match')).toBe('"etag-1"')
    expect(calls.uploads).toHaveLength(0)
    expect(supabase.requests).toHaveLength(0)
  })

  it('skips an icon whose ETag has not changed', async () => {
    const calls = mockSourceAndStorage({ etag: '"etag-1"' })
    supabase.respond(() => [])

    const result = await syncProfileImage({
      current,
      now,
      owner,
      sourceUrl: SOURCE_URL,
      supabaseClient: supabase.supabaseClient,
    })

    expect(result.status).toBe('unchanged')
    expect(calls.uploads).toHaveLength(0)
    expect(supabase.requests).toHaveLength(0)
  })

  it('replaces a changed icon in place and removes the old object', async () => {
    const calls = mockSourceAndStorage()
    supabase.respond(() => [{ id: current.id }])

    const result = await syncProfileImage({
      current,
      now,
      owner,
      sourceUrl: SOURCE_URL,
      supabaseClient: supabase.supabaseClient,
    })

    expect(result.status).toBe('replaced')
    expect(result.image).toEqual({
      etag: '"etag-2"',
      id: current.id,
      path: calls.uploads[0]?.path,
    })

    const [update] = supabase.written('PATCH', 'profile_images')

    expect(update?.query).toMatchObject({
      id: `eq.${current.id}`,
      path: `eq.${current.path}`,
    })
    expect(update?.body).toMatchObject({
      etag: '"etag-2"',
      path: result.image.path,
    })
    expect(calls.removed).toEqual([{ prefixes: [current.path] }])
  })

  it('keeps the current icon when it changed meanwhile', async () => {
    const calls = mockSourceAndStorage()
    supabase.respond(() => [])

    await expect(
      syncProfileImage({
        current,
        now,
        owner,
        sourceUrl: SOURCE_URL,
        supabaseClient: supabase.supabaseClient,
      }),
    ).rejects.toThrow('Failed to replace a profile image')
    // Only the object uploaded by this call is removed.
    expect(calls.removed).toEqual([{ prefixes: [calls.uploads[0]?.path] }])
  })

  it('removes the uploaded object when the row cannot be saved', async () => {
    const calls = mockSourceAndStorage()
    supabase.respond(() => postgresError('23505', 'duplicate key value'))

    await expect(
      syncProfileImage({
        current: null,
        now,
        owner,
        sourceUrl: SOURCE_URL,
        supabaseClient: supabase.supabaseClient,
      }),
    ).rejects.toThrow('duplicate key value')
    expect(calls.removed).toEqual([{ prefixes: [calls.uploads[0]?.path] }])
  })

  it('rejects responses that are not images without storing anything', async () => {
    const calls = mockSourceAndStorage({ contentType: 'text/html' })
    supabase.respond(() => [])

    await expect(
      syncProfileImage({
        current: null,
        now,
        owner,
        sourceUrl: SOURCE_URL,
        supabaseClient: supabase.supabaseClient,
      }),
    ).rejects.toThrow('Expected an image')
    expect(calls.uploads).toHaveLength(0)
    expect(supabase.requests).toHaveLength(0)
  })
})

describe('removeProfileImage', () => {
  it('removes the row, then the stored object', async () => {
    const calls = mockSourceAndStorage()
    supabase.respond(() => [])

    await removeProfileImage(supabase.supabaseClient, current)

    expect(supabase.written('DELETE', 'profile_images')[0]?.query['id']).toBe(
      `eq.${current.id}`,
    )
    expect(calls.removed).toEqual([{ prefixes: [current.path] }])
  })

  it('keeps the stored object when the row cannot be deleted', async () => {
    const calls = mockSourceAndStorage()
    supabase.respond(() => postgresError('42501', 'permission denied'))

    await expect(
      removeProfileImage(supabase.supabaseClient, current),
    ).rejects.toThrow('permission denied')
    expect(calls.removed).toHaveLength(0)
  })
})
