import { HttpResponse, http } from 'msw'
import { beforeAll, describe, expect, it } from 'vitest'
import { TEST_NOW } from '../../internal/testing/context.js'
import {
  createImage,
  mockStorage,
  serveImage,
} from '../../internal/testing/profile-images.js'
import { setupSupabase } from '../../internal/testing/supabase.js'
import {
  type SavedTwitchUserIcon,
  selectTwitchUserIconUrl,
  syncTwitchUserIcon,
} from '../profile-image.js'

const supabase = setupSupabase()

/** A `profile_image_url` as returned by the Helix API. */
const ICON_URL =
  'https://static-cdn.jtvnw.net/jtv_user_pictures/8a6381c7-d0c0-4576-b179-38bd5ce1d6af-profile_image-300x300.png'

/** One of the icons Twitch gives users without one of their own. */
const DEFAULT_ICON_URL =
  'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-300x300.png'

describe('selectTwitchUserIconUrl', () => {
  it('uses the icon of the user as is', () => {
    expect(selectTwitchUserIconUrl(ICON_URL)).toBe(ICON_URL)
  })

  it('returns null when the user has no icon', () => {
    expect(selectTwitchUserIconUrl('')).toBeNull()
    expect(selectTwitchUserIconUrl('   ')).toBeNull()
    expect(selectTwitchUserIconUrl(null)).toBeNull()
    expect(selectTwitchUserIconUrl(undefined)).toBeNull()
  })

  it("treats Twitch's default icons as no icon", () => {
    expect(selectTwitchUserIconUrl(DEFAULT_ICON_URL)).toBeNull()
    expect(
      selectTwitchUserIconUrl(
        'https://static-cdn.jtvnw.net/user-default-pictures/0ecbb6c3-fecb-4016-8115-aa467b7c36ed-profile_image-300x300.jpg',
      ),
    ).toBeNull()
  })

  it('ignores URLs that are not HTTPS', () => {
    expect(
      selectTwitchUserIconUrl(ICON_URL.replace('https:', 'http:')),
    ).toBeNull()
    expect(selectTwitchUserIconUrl('not a url')).toBeNull()
  })
})

describe('syncTwitchUserIcon', () => {
  const saved: SavedTwitchUserIcon = {
    id: 'user-row-1',
    profile_images: null,
    twitch_user_id: '1001',
  }
  const savedWithIcon: SavedTwitchUserIcon = {
    ...saved,
    profile_images: {
      etag: '"etag-1"',
      id: 'image-1',
      path: 'twitch/1001/old.webp',
      source_url: ICON_URL,
    },
  }

  let image: Buffer

  beforeAll(async () => {
    image = await createImage(300, 300)
  })

  function respondWithUser(): void {
    supabase.respond(({ method, table }) =>
      method === 'PATCH' && table === 'twitch_users' ? [{ id: saved.id }] : [],
    )
  }

  it('stores the icon of a user that has none yet', async () => {
    const requests = serveImage(supabase, ICON_URL, {
      body: image,
      contentType: 'image/png',
    })
    const storage = mockStorage(supabase)
    respondWithUser()

    await expect(
      syncTwitchUserIcon({
        now: TEST_NOW,
        saved,
        supabaseClient: supabase.supabaseClient,
        user: { profile_image_url: ICON_URL },
      }),
    ).resolves.toBe('created')

    expect(requests).toEqual([{ ifNoneMatch: null, url: ICON_URL }])
    expect(storage.uploads[0]?.path).toMatch(/^twitch\/1001\/[^/]+\.webp$/)
    expect(supabase.written('POST', 'profile_images')[0]?.body).toMatchObject({
      height: 256,
      source_url: ICON_URL,
      width: 256,
    })
    expect(supabase.written('PATCH', 'twitch_users')[0]?.query).toEqual({
      id: 'eq.user-row-1',
      select: 'id',
    })
  })

  it('asks Twitch whether a saved icon changed', async () => {
    const requests = serveImage(supabase, ICON_URL, { body: image })
    const storage = mockStorage(supabase)
    respondWithUser()

    await expect(
      syncTwitchUserIcon({
        now: TEST_NOW,
        saved: savedWithIcon,
        supabaseClient: supabase.supabaseClient,
        user: { profile_image_url: ICON_URL },
      }),
    ).resolves.toBe('unchanged')

    expect(requests).toEqual([{ ifNoneMatch: '"etag-1"', url: ICON_URL }])
    expect(storage.uploads).toHaveLength(0)
    expect(supabase.requests).toHaveLength(0)
  })

  it('replaces the icon when Twitch serves a new one', async () => {
    const newIconUrl = ICON_URL.replace('8a6381c7', '0f9e1a2b')
    serveImage(supabase, newIconUrl, { body: image })
    const storage = mockStorage(supabase)
    respondWithUser()

    await expect(
      syncTwitchUserIcon({
        now: TEST_NOW,
        saved: savedWithIcon,
        supabaseClient: supabase.supabaseClient,
        user: { profile_image_url: newIconUrl },
      }),
    ).resolves.toBe('replaced')

    expect(storage.uploads).toHaveLength(1)
    expect(supabase.written('DELETE', 'profile_images')[0]?.query).toEqual({
      id: 'eq.image-1',
    })
    expect(storage.removed).toEqual([['twitch/1001/old.webp']])
  })

  it('removes the icon of a user who went back to a default one', async () => {
    const storage = mockStorage(supabase)
    respondWithUser()

    await expect(
      syncTwitchUserIcon({
        now: TEST_NOW,
        saved: savedWithIcon,
        supabaseClient: supabase.supabaseClient,
        user: { profile_image_url: DEFAULT_ICON_URL },
      }),
    ).resolves.toBe('removed')

    expect(supabase.written('PATCH', 'twitch_users')[0]?.body).toEqual({
      profile_image_id: null,
    })
    expect(storage.removed).toEqual([['twitch/1001/old.webp']])
  })

  it('writes nothing for a user without an icon', async () => {
    const storage = mockStorage(supabase)
    respondWithUser()

    await expect(
      syncTwitchUserIcon({
        now: TEST_NOW,
        saved,
        supabaseClient: supabase.supabaseClient,
        user: { profile_image_url: '' },
      }),
    ).resolves.toBe('unchanged')

    expect(storage.uploads).toHaveLength(0)
    expect(supabase.requests).toHaveLength(0)
  })

  it('rejects when Twitch answers with an HTTP error', async () => {
    supabase.server.use(
      http.get(ICON_URL, () => new HttpResponse(null, { status: 404 })),
    )
    const storage = mockStorage(supabase)
    respondWithUser()

    await expect(
      syncTwitchUserIcon({
        now: TEST_NOW,
        saved,
        supabaseClient: supabase.supabaseClient,
        user: { profile_image_url: ICON_URL },
      }),
    ).rejects.toThrow()

    expect(storage.uploads).toHaveLength(0)
    expect(supabase.requests).toHaveLength(0)
  })

  it('rejects when Twitch does not serve an image', async () => {
    serveImage(supabase, ICON_URL, {
      body: Buffer.from('<Error>AccessDenied</Error>'),
      contentType: 'application/xml',
    })
    const storage = mockStorage(supabase)
    respondWithUser()

    await expect(
      syncTwitchUserIcon({
        now: TEST_NOW,
        saved,
        supabaseClient: supabase.supabaseClient,
        user: { profile_image_url: ICON_URL },
      }),
    ).rejects.toThrow('Expected an image')

    expect(storage.uploads).toHaveLength(0)
    expect(supabase.requests).toHaveLength(0)
  })
})
