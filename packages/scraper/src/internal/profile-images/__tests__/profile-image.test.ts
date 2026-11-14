import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  createImage,
  mockStorage,
  serveImage,
} from '../../testing/profile-images.js'
import { postgresError, setupSupabase } from '../../testing/supabase.js'
import {
  createProfileImage,
  downloadProfileImage,
  type ProfileImageOwner,
  removeProfileImage,
  type StoredProfileImage,
} from '../profile-image.js'

const supabase = setupSupabase()

const IMAGE_URL = 'https://yt3.test/avatar-1.jpg'
const now = Temporal.Instant.from('2024-05-01T12:34:56.789Z')
const owner: ProfileImageOwner = {
  id: 'channel-1',
  platform: 'youtube',
  platformId: 'UC1',
}
const saved: StoredProfileImage = {
  etag: '"etag-1"',
  id: 'image-1',
  path: 'youtube/UC1/old.webp',
  sourceUrl: IMAGE_URL,
}

let image: Buffer

beforeAll(async () => {
  image = await createImage(400, 300)
})

describe('downloadProfileImage', () => {
  it('downloads an icon that was never stored', async () => {
    const requests = serveImage(supabase, IMAGE_URL, { body: image })

    const downloaded = await downloadProfileImage(IMAGE_URL, null)

    expect(downloaded).toMatchObject({ etag: '"etag-1"', sourceUrl: IMAGE_URL })
    expect(Buffer.from(downloaded?.body ?? new ArrayBuffer(0))).toEqual(image)
    expect(requests).toEqual([{ ifNoneMatch: null, url: IMAGE_URL }])
  })

  it('skips an icon the platform reports as not modified', async () => {
    const requests = serveImage(supabase, IMAGE_URL, { body: image })

    await expect(downloadProfileImage(IMAGE_URL, saved)).resolves.toBeNull()
    expect(requests).toEqual([{ ifNoneMatch: '"etag-1"', url: IMAGE_URL }])
  })

  it('skips an icon whose ETag is unchanged even without a 304', async () => {
    const requests = serveImage(supabase, IMAGE_URL, {
      body: image,
      conditional: false,
    })

    await expect(downloadProfileImage(IMAGE_URL, saved)).resolves.toBeNull()
    expect(requests).toEqual([{ ifNoneMatch: '"etag-1"', url: IMAGE_URL }])
  })

  it('downloads an icon whose ETag changed behind the same URL', async () => {
    serveImage(supabase, IMAGE_URL, { body: image, etag: '"etag-2"' })

    await expect(downloadProfileImage(IMAGE_URL, saved)).resolves.toMatchObject(
      { etag: '"etag-2"' },
    )
  })

  it('treats a new URL as a new icon, whatever its ETag', async () => {
    const newUrl = 'https://yt3.test/avatar-2.jpg'
    const requests = serveImage(supabase, newUrl, { body: image })

    await expect(downloadProfileImage(newUrl, saved)).resolves.toMatchObject({
      etag: '"etag-1"',
      sourceUrl: newUrl,
    })
    expect(requests).toEqual([{ ifNoneMatch: null, url: newUrl }])
  })

  it('does not download again from the same URL when no ETag is known', async () => {
    const requests = serveImage(supabase, IMAGE_URL, { body: image })

    await expect(
      downloadProfileImage(IMAGE_URL, { ...saved, etag: null }),
    ).resolves.toBeNull()
    expect(requests).toHaveLength(0)
  })

  it('rejects responses that are not images', async () => {
    serveImage(supabase, IMAGE_URL, { body: image, contentType: 'text/html' })

    await expect(downloadProfileImage(IMAGE_URL, null)).rejects.toThrow(
      'Expected an image',
    )
  })
})

describe('createProfileImage', () => {
  it('stores a centred square WebP and registers it', async () => {
    const storage = mockStorage(supabase)
    supabase.respond(() => [])

    const stored = await createProfileImage({
      image: {
        body: new Uint8Array(image).buffer,
        etag: '"etag-1"',
        sourceUrl: IMAGE_URL,
      },
      now,
      owner,
      supabaseClient: supabase.supabaseClient,
    })

    expect(stored).toEqual({
      etag: '"etag-1"',
      id: expect.any(String),
      path: expect.stringMatching(/^youtube\/UC1\/[\w-]+\.webp$/),
      sourceUrl: IMAGE_URL,
    })
    expect(storage.uploads).toHaveLength(1)
    expect(storage.uploads[0]).toMatchObject({
      contentType: 'image/webp',
      path: stored.path,
    })
    await expect(
      sharp(storage.uploads[0]?.body).metadata(),
    ).resolves.toMatchObject({ format: 'webp', height: 256, width: 256 })
    expect(supabase.written('POST', 'profile_images')[0]?.body).toEqual({
      blur_data_url: expect.stringMatching(/^data:image\/jpeg;base64,/),
      created_at: '2024-05-01T12:34:56Z',
      etag: '"etag-1"',
      height: 256,
      id: stored.id,
      path: stored.path,
      source_url: IMAGE_URL,
      updated_at: '2024-05-01T12:34:56Z',
      width: 256,
    })
  })

  it('does not enlarge icons smaller than the maximum size', async () => {
    const storage = mockStorage(supabase)
    supabase.respond(() => [])
    const small = await createImage(88, 100)

    await createProfileImage({
      image: {
        body: new Uint8Array(small).buffer,
        etag: null,
        sourceUrl: IMAGE_URL,
      },
      now,
      owner: { id: 'user-1', platform: 'twitch', platformId: '100001' },
      supabaseClient: supabase.supabaseClient,
    })

    expect(storage.uploads[0]?.path).toMatch(/^twitch\/100001\//)
    await expect(
      sharp(storage.uploads[0]?.body).metadata(),
    ).resolves.toMatchObject({ height: 88, width: 88 })
    expect(supabase.written('POST', 'profile_images')[0]?.body).toMatchObject({
      etag: null,
      height: 88,
      width: 88,
    })
  })

  it('rejects broken images without storing anything', async () => {
    const storage = mockStorage(supabase)
    supabase.respond(() => [])

    await expect(
      createProfileImage({
        image: {
          body: new TextEncoder().encode('not an image').buffer,
          etag: null,
          sourceUrl: IMAGE_URL,
        },
        now,
        owner,
        supabaseClient: supabase.supabaseClient,
      }),
    ).rejects.toThrow()
    expect(storage.uploads).toHaveLength(0)
    expect(supabase.requests).toHaveLength(0)
  })

  it('removes the stored object when it cannot be registered', async () => {
    const storage = mockStorage(supabase)
    supabase.respond(() => postgresError('23502', 'null value in column'))

    await expect(
      createProfileImage({
        image: {
          body: new Uint8Array(image).buffer,
          etag: null,
          sourceUrl: IMAGE_URL,
        },
        now,
        owner,
        supabaseClient: supabase.supabaseClient,
      }),
    ).rejects.toThrow('null value in column')
    expect(storage.removed).toEqual([[storage.uploads[0]?.path]])
  })
})

describe('removeProfileImage', () => {
  it('deletes the row, then the stored object', async () => {
    const storage = mockStorage(supabase)
    supabase.respond(() => [])

    await expect(
      removeProfileImage(supabase.supabaseClient, saved),
    ).resolves.toBe(true)
    expect(supabase.written('DELETE', 'profile_images')[0]?.query['id']).toBe(
      'eq.image-1',
    )
    expect(storage.removed).toEqual([['youtube/UC1/old.webp']])
  })

  it('keeps an icon that is still in use', async () => {
    const storage = mockStorage(supabase)
    supabase.respond(() =>
      postgresError('23503', 'violates foreign key constraint'),
    )

    await expect(
      removeProfileImage(supabase.supabaseClient, saved),
    ).resolves.toBe(false)
    expect(storage.removed).toHaveLength(0)
  })

  it('fails when the row cannot be deleted for another reason', async () => {
    const storage = mockStorage(supabase)
    supabase.respond(() => postgresError('42501', 'permission denied'))

    await expect(
      removeProfileImage(supabase.supabaseClient, saved),
    ).rejects.toThrow('permission denied')
    expect(storage.removed).toHaveLength(0)
  })
})
