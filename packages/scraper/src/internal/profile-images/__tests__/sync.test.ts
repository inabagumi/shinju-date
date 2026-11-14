import { beforeAll, describe, expect, it } from 'vitest'
import {
  createImage,
  mockStorage,
  serveImage,
} from '../../testing/profile-images.js'
import { postgresError, setupSupabase } from '../../testing/supabase.js'
import type { ProfileImageOwner, StoredProfileImage } from '../profile-image.js'
import { syncProfileImage } from '../sync.js'

const supabase = setupSupabase()

const IMAGE_URL = 'https://yt3.test/avatar-1.jpg'
const now = Temporal.Instant.from('2024-05-01T12:00:00Z')
const channel: ProfileImageOwner = {
  id: 'channel-1',
  platform: 'youtube',
  platformId: 'UC1',
}
const twitchUser: ProfileImageOwner = {
  id: 'user-1',
  platform: 'twitch',
  platformId: '100001',
}
const saved: StoredProfileImage = {
  etag: '"etag-1"',
  id: 'image-1',
  path: 'youtube/UC1/old.webp',
  sourceUrl: IMAGE_URL,
}

let image: Buffer

beforeAll(async () => {
  image = await createImage(300, 300)
})

/** A database in which the owner exists and every write succeeds. */
function respondWithOwner(): void {
  supabase.respond(({ method, table }) =>
    method === 'PATCH' && table !== 'profile_images' ? [{ id: 'owner' }] : [],
  )
}

describe('syncProfileImage', () => {
  it('does nothing when there is no icon on either side', async () => {
    respondWithOwner()

    await expect(
      syncProfileImage({
        now,
        owner: channel,
        saved: null,
        sourceUrl: null,
        supabaseClient: supabase.supabaseClient,
      }),
    ).resolves.toBe('unchanged')
    expect(supabase.requests).toHaveLength(0)
  })

  it('stores and assigns the first icon of a channel', async () => {
    serveImage(supabase, IMAGE_URL, { body: image })
    const storage = mockStorage(supabase)
    respondWithOwner()

    await expect(
      syncProfileImage({
        now,
        owner: channel,
        saved: null,
        sourceUrl: IMAGE_URL,
        supabaseClient: supabase.supabaseClient,
      }),
    ).resolves.toBe('created')

    const inserted = supabase.written('POST', 'profile_images')[0]?.body as {
      id: string
    }
    const [assignment] = supabase.written('PATCH', 'youtube_channels')

    expect(storage.uploads).toHaveLength(1)
    expect(assignment?.body).toEqual({ profile_image_id: inserted.id })
    expect(assignment?.query['id']).toBe('eq.channel-1')
    expect(storage.removed).toHaveLength(0)
  })

  it('leaves an unchanged icon alone', async () => {
    serveImage(supabase, IMAGE_URL, { body: image })
    const storage = mockStorage(supabase)
    respondWithOwner()

    await expect(
      syncProfileImage({
        now,
        owner: channel,
        saved,
        sourceUrl: IMAGE_URL,
        supabaseClient: supabase.supabaseClient,
      }),
    ).resolves.toBe('unchanged')
    expect(storage.uploads).toHaveLength(0)
    expect(supabase.requests).toHaveLength(0)
  })

  it('assigns a changed icon before discarding the old one', async () => {
    const newUrl = 'https://twitch.test/avatar-2.png'
    serveImage(supabase, newUrl, { body: image, etag: '"etag-2"' })
    const storage = mockStorage(supabase)
    respondWithOwner()

    await expect(
      syncProfileImage({
        now,
        owner: twitchUser,
        saved: { ...saved, path: 'twitch/100001/old.webp' },
        sourceUrl: newUrl,
        supabaseClient: supabase.supabaseClient,
      }),
    ).resolves.toBe('replaced')

    const inserted = supabase.written('POST', 'profile_images')[0]?.body as {
      id: string
    }

    expect(
      supabase.requests.map(({ method, table }) => `${method} ${table}`),
    ).toEqual([
      'POST profile_images',
      'PATCH twitch_users',
      'DELETE profile_images',
    ])
    expect(supabase.written('PATCH', 'twitch_users')[0]?.body).toEqual({
      profile_image_id: inserted.id,
    })
    expect(supabase.written('DELETE', 'profile_images')[0]?.query['id']).toBe(
      'eq.image-1',
    )
    expect(storage.removed).toEqual([['twitch/100001/old.webp']])
  })

  it('unassigns and discards the icon when the platform has none', async () => {
    const storage = mockStorage(supabase)
    respondWithOwner()

    await expect(
      syncProfileImage({
        now,
        owner: channel,
        saved,
        sourceUrl: null,
        supabaseClient: supabase.supabaseClient,
      }),
    ).resolves.toBe('removed')
    expect(supabase.written('PATCH', 'youtube_channels')[0]?.body).toEqual({
      profile_image_id: null,
    })
    expect(storage.removed).toEqual([['youtube/UC1/old.webp']])
  })

  it('still succeeds when the old icon cannot be discarded', async () => {
    serveImage(supabase, IMAGE_URL, { body: image, etag: '"etag-2"' })
    mockStorage(supabase)
    supabase.respond(({ method, table }) => {
      if (method === 'PATCH') {
        return [{ id: 'owner' }]
      }

      if (method === 'DELETE' && table === 'profile_images') {
        return postgresError('57014', 'canceling statement due to timeout')
      }

      return []
    })

    await expect(
      syncProfileImage({
        now,
        owner: channel,
        saved,
        sourceUrl: IMAGE_URL,
        supabaseClient: supabase.supabaseClient,
      }),
    ).resolves.toBe('replaced')
  })

  it('discards the new icon and keeps the old one when it cannot be assigned', async () => {
    serveImage(supabase, IMAGE_URL, { body: image, etag: '"etag-2"' })
    const storage = mockStorage(supabase)
    // The channel was deleted in the meantime: the update matches no row.
    supabase.respond(() => [])

    await expect(
      syncProfileImage({
        now,
        owner: channel,
        saved,
        sourceUrl: IMAGE_URL,
        supabaseClient: supabase.supabaseClient,
      }),
    ).rejects.toThrow('was not found')

    const inserted = supabase.written('POST', 'profile_images')[0]?.body as {
      id: string
      path: string
    }

    expect(
      supabase
        .written('DELETE', 'profile_images')
        .map(({ query }) => query['id']),
    ).toEqual([`eq.${inserted.id}`])
    expect(storage.removed).toEqual([[inserted.path]])
  })
})
