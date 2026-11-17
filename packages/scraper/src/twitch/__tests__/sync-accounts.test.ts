import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestContext } from '../../internal/testing/context.js'
import {
  createImage,
  mockStorage,
  serveImage,
} from '../../internal/testing/profile-images.js'
import {
  postgresError,
  type SupabaseRequest,
  setupSupabase,
} from '../../internal/testing/supabase.js'
import type { TwitchFetcher } from '../fetcher.js'
import { syncTwitchUsers, syncTwitchUsersOfTalent } from '../sync-accounts.js'
import type { TwitchUser } from '../types.js'

const supabase = setupSupabase()
const reportError = vi.fn()
const createContext = <T>(fetcher: T) =>
  createTestContext({
    fetcher,
    reportError,
    supabaseClient: supabase.supabaseClient,
  })

function createUser(
  id: string,
  login: string,
  displayName: string,
  profileImageUrl = '',
): TwitchUser {
  return {
    broadcaster_type: '',
    created_at: '2020-01-01T00:00:00Z',
    description: '',
    display_name: displayName,
    id,
    login,
    offline_image_url: '',
    profile_image_url: profileImageUrl,
    type: '',
  }
}

function createFetcher(users: TwitchUser[]) {
  const getAccounts = vi.fn(async () => users)

  return { fetcher: { getAccounts } as unknown as TwitchFetcher, getAccounts }
}

const savedTalents = [
  {
    id: 'talent-1',
    twitch_users: [
      {
        id: 'user-row-1',
        name: 'Alice',
        profile_images: null,
        twitch_login_name: 'alice',
        twitch_user_id: '1001',
      },
      {
        id: 'user-row-2',
        name: 'Alice Sub',
        profile_images: null,
        twitch_login_name: 'alice_sub',
        twitch_user_id: '1002',
      },
    ],
  },
]

/**
 * A database holding `savedTalents`, in which every write succeeds.
 */
function respondWithSavedTalents(
  override?: (request: SupabaseRequest) => unknown,
): void {
  supabase.respond((request) => {
    const overridden = override?.(request)

    if (overridden !== undefined) {
      return overridden
    }

    const { method, table } = request

    if (method === 'GET') {
      return table === 'talents' ? savedTalents : []
    }

    return method === 'PATCH' && table === 'twitch_users'
      ? [{ id: 'user-row' }]
      : []
  })
}

describe('syncTwitchUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates only the accounts whose name or login changed', async () => {
    respondWithSavedTalents()
    const { getAccounts, fetcher } = createFetcher([
      createUser('1001', 'alice', 'Alice'),
      createUser('1002', 'alice_2nd', 'Alice 2nd'),
    ])

    const changed = await syncTwitchUsers(createContext(fetcher))

    expect(changed).toBeGreaterThan(0)
    expect(getAccounts).toHaveBeenCalledWith(['1001', '1002'])
    expect(supabase.written('PATCH', 'twitch_users')).toEqual([
      expect.objectContaining({
        body: { name: 'Alice 2nd', twitch_login_name: 'alice_2nd' },
        query: { id: 'eq.user-row-2' },
      }),
    ])
  })

  it('writes nothing when every account is up to date', async () => {
    respondWithSavedTalents()
    const { fetcher } = createFetcher([
      createUser('1001', 'alice', 'Alice'),
      createUser('1002', 'alice_sub', 'Alice Sub'),
    ])

    const changed = await syncTwitchUsers(createContext(fetcher))

    expect(changed).toBe(0)
    expect(supabase.requests).toHaveLength(1)
  })

  it('reports an account that could not be updated and handles the rest', async () => {
    supabase.respond(({ method, query }) => {
      if (method === 'GET') {
        return savedTalents
      }

      return query['id'] === 'eq.user-row-1'
        ? postgresError('23505', 'duplicate key value')
        : []
    })
    const { fetcher } = createFetcher([
      createUser('1001', 'alice_new', 'Alice'),
      createUser('1002', 'alice_sub', 'Alice Sub!'),
    ])

    const changed = await syncTwitchUsers(createContext(fetcher))

    expect(changed).toBeGreaterThan(0)
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('duplicate key value'),
      }),
      { twitchUserId: '1001' },
    )
  })
  it('loads the saved icon of every account', async () => {
    respondWithSavedTalents()
    const { fetcher } = createFetcher([])

    await syncTwitchUsers(createContext(fetcher))

    expect(supabase.requests[0]?.query['select']).toContain(
      'profile_images(id,path,etag,source_url)',
    )
  })

  describe('icons', () => {
    const ICON_URL =
      'https://static-cdn.jtvnw.net/jtv_user_pictures/alice-profile_image-300x300.png'

    let image: Buffer

    beforeAll(async () => {
      image = await createImage(300, 300)
    })

    it('stores the icon of an account that has none yet', async () => {
      serveImage(supabase, ICON_URL, { body: image, contentType: 'image/png' })
      const storage = mockStorage(supabase)
      respondWithSavedTalents()
      const { fetcher } = createFetcher([
        createUser('1001', 'alice', 'Alice', ICON_URL),
      ])

      const changed = await syncTwitchUsers(createContext(fetcher))

      const inserted = supabase.written('POST', 'profile_images')[0]?.body as {
        id: string
        source_url: string
      }

      expect(changed).toBe(1)
      expect(storage.uploads).toHaveLength(1)
      expect(storage.uploads[0]?.path).toMatch(/^twitch\/1001\//)
      expect(inserted.source_url).toBe(ICON_URL)
      expect(supabase.written('PATCH', 'twitch_users')).toEqual([
        expect.objectContaining({
          body: { profile_image_id: inserted.id },
          query: { id: 'eq.user-row-1', select: 'id' },
        }),
      ])
      expect(reportError).not.toHaveBeenCalled()
    })

    it('leaves an icon alone when Twitch serves the same one', async () => {
      const requests = serveImage(supabase, ICON_URL, { body: image })
      const storage = mockStorage(supabase)
      respondWithSavedTalents(({ method, table }) =>
        method === 'GET' && table === 'talents'
          ? [
              {
                id: 'talent-1',
                twitch_users: [
                  {
                    ...savedTalents[0]?.twitch_users[0],
                    profile_images: {
                      etag: '"etag-1"',
                      id: 'image-1',
                      path: 'twitch/1001/icon.webp',
                      source_url: ICON_URL,
                    },
                  },
                ],
              },
            ]
          : undefined,
      )
      const { fetcher } = createFetcher([
        createUser('1001', 'alice', 'Alice', ICON_URL),
      ])

      const changed = await syncTwitchUsers(createContext(fetcher))

      expect(changed).toBe(0)
      expect(requests).toEqual([{ ifNoneMatch: '"etag-1"', url: ICON_URL }])
      expect(storage.uploads).toHaveLength(0)
      expect(supabase.written('PATCH', 'twitch_users')).toHaveLength(0)
    })

    it('still syncs the name when the icon cannot be stored', async () => {
      serveImage(supabase, ICON_URL, {
        body: Buffer.from('not found'),
        contentType: 'text/plain',
      })
      mockStorage(supabase)
      respondWithSavedTalents()
      const { fetcher } = createFetcher([
        createUser('1002', 'alice_2nd', 'Alice 2nd', ICON_URL),
      ])

      const changed = await syncTwitchUsers(createContext(fetcher))

      expect(changed).toBe(1)
      expect(supabase.written('PATCH', 'twitch_users')).toEqual([
        expect.objectContaining({
          body: { name: 'Alice 2nd', twitch_login_name: 'alice_2nd' },
        }),
      ])
      expect(supabase.written('POST', 'profile_images')).toHaveLength(0)
      expect(reportError).toHaveBeenCalledWith(expect.any(TypeError), {
        operation: 'syncProfileImage',
        twitchUserId: '1002',
      })
    })

    it('still syncs the icon when the name cannot be updated', async () => {
      serveImage(supabase, ICON_URL, { body: image, contentType: 'image/png' })
      const storage = mockStorage(supabase)
      respondWithSavedTalents(({ body, method, table }) =>
        method === 'PATCH' &&
        table === 'twitch_users' &&
        body !== null &&
        typeof body === 'object' &&
        'name' in body
          ? postgresError('23505', 'duplicate key value')
          : undefined,
      )
      const { fetcher } = createFetcher([
        createUser('1001', 'alice_new', 'Alice', ICON_URL),
      ])

      const changed = await syncTwitchUsers(createContext(fetcher))

      expect(changed).toBe(1)
      expect(storage.uploads).toHaveLength(1)
      expect(reportError).toHaveBeenCalledTimes(1)
      expect(reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('duplicate key value'),
        }),
        { twitchUserId: '1001' },
      )
    })

    it('writes nothing for an account with a default icon', async () => {
      const storage = mockStorage(supabase)
      respondWithSavedTalents()
      const { fetcher } = createFetcher([
        createUser(
          '1001',
          'alice',
          'Alice',
          'https://static-cdn.jtvnw.net/user-default-pictures-uv/default-profile_image-300x300.png',
        ),
      ])

      const changed = await syncTwitchUsers(createContext(fetcher))

      expect(changed).toBe(0)
      expect(storage.uploads).toHaveLength(0)
      expect(supabase.requests).toHaveLength(1)
    })
  })
})

describe('syncTwitchUsersOfTalent', () => {
  const ICON_URL =
    'https://static-cdn.jtvnw.net/jtv_user_pictures/alice-profile_image-300x300.png'

  /** Fails to write the display name and login of `user-row-1`. */
  const failDetailsOfFirstUser = ({ body, method, query }: SupabaseRequest) =>
    method === 'PATCH' &&
    query['id'] === 'eq.user-row-1' &&
    body !== null &&
    typeof body === 'object' &&
    'name' in body
      ? postgresError('23505', 'duplicate key value')
      : undefined

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('syncs only the accounts of the talent and returns what changed', async () => {
    respondWithSavedTalents()
    const { fetcher, getAccounts } = createFetcher([
      createUser('1001', 'alice', 'Alice'),
      createUser('1002', 'alice_2nd', 'Alice Sub'),
    ])

    const results = await syncTwitchUsersOfTalent(
      createContext(fetcher),
      'talent-1',
    )

    expect(supabase.requests[0]?.query).toMatchObject({
      deleted_at: 'is.null',
      id: 'eq.talent-1',
    })
    expect(getAccounts).toHaveBeenCalledWith(['1001', '1002'])
    expect(results).toEqual([
      {
        accountId: 'user-row-1',
        iconUpdated: false,
        name: 'Alice',
        status: 'unchanged',
      },
      {
        accountId: 'user-row-2',
        changes: {
          after: { twitch_login_name: 'alice_2nd' },
          before: { twitch_login_name: 'alice_sub' },
        },
        iconUpdated: false,
        name: 'Alice Sub',
        status: 'updated',
      },
    ])
    expect(supabase.written('PATCH', 'twitch_users')).toEqual([
      expect.objectContaining({
        body: { name: 'Alice Sub', twitch_login_name: 'alice_2nd' },
        query: { id: 'eq.user-row-2' },
      }),
    ])
  })

  it('writes nothing when every account is up to date', async () => {
    respondWithSavedTalents()
    const { fetcher } = createFetcher([
      createUser('1001', 'alice', 'Alice'),
      createUser('1002', 'alice_sub', 'Alice Sub'),
    ])

    const results = await syncTwitchUsersOfTalent(
      createContext(fetcher),
      'talent-1',
    )

    expect(results.map(({ status }) => status)).toEqual([
      'unchanged',
      'unchanged',
    ])
    expect(supabase.requests).toHaveLength(1)
  })

  it('reports an account Twitch does not return as not found', async () => {
    respondWithSavedTalents()
    const { fetcher } = createFetcher([
      createUser('1002', 'alice_sub', 'Alice Sub'),
    ])

    const results = await syncTwitchUsersOfTalent(
      createContext(fetcher),
      'talent-1',
    )

    expect(results[0]).toEqual({
      accountId: 'user-row-1',
      iconUpdated: false,
      name: 'Alice',
      status: 'not-found',
    })
  })

  it('reports an account that cannot be updated as failed and syncs the rest', async () => {
    respondWithSavedTalents(failDetailsOfFirstUser)
    const { fetcher } = createFetcher([
      createUser('1001', 'alice_new', 'Alice'),
      createUser('1002', 'alice_sub', 'Alice Sub!'),
    ])

    const results = await syncTwitchUsersOfTalent(
      createContext(fetcher),
      'talent-1',
    )

    expect(results.map(({ name, status }) => ({ name, status }))).toEqual([
      { name: 'Alice', status: 'failed' },
      { name: 'Alice Sub!', status: 'updated' },
    ])
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('duplicate key value'),
      }),
      { twitchUserId: '1001' },
    )
  })

  it('still syncs the icon of an account whose name cannot be updated', async () => {
    serveImage(supabase, ICON_URL, {
      body: await createImage(300, 300),
      contentType: 'image/png',
    })
    mockStorage(supabase)
    respondWithSavedTalents(failDetailsOfFirstUser)
    const { fetcher } = createFetcher([
      createUser('1001', 'alice_new', 'Alice', ICON_URL),
    ])

    const [result] = await syncTwitchUsersOfTalent(
      createContext(fetcher),
      'talent-1',
    )

    expect(result).toEqual({
      accountId: 'user-row-1',
      iconUpdated: true,
      name: 'Alice',
      status: 'failed',
    })
  })

  it('returns nothing without asking Twitch when the talent has no accounts', async () => {
    supabase.respond(() => [])
    const { fetcher, getAccounts } = createFetcher([])

    await expect(
      syncTwitchUsersOfTalent(createContext(fetcher), 'talent-9'),
    ).resolves.toEqual([])
    expect(getAccounts).not.toHaveBeenCalled()
  })

  it('fails when the accounts cannot be loaded', async () => {
    supabase.respond(() => postgresError('42501', 'permission denied'))
    const { fetcher } = createFetcher([])

    await expect(
      syncTwitchUsersOfTalent(createContext(fetcher), 'talent-1'),
    ).rejects.toThrow('permission denied')
  })

  it('fails when Twitch cannot be read', async () => {
    respondWithSavedTalents()
    const fetcher = {
      getAccounts: vi.fn().mockRejectedValue(new Error('Helix is down')),
    } as unknown as TwitchFetcher

    await expect(
      syncTwitchUsersOfTalent(createContext(fetcher), 'talent-1'),
    ).rejects.toThrow('Helix is down')
    expect(supabase.written('PATCH', 'twitch_users')).toHaveLength(0)
  })
})
