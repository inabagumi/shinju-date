import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestContext } from '../../internal/testing/context.js'
import {
  postgresError,
  setupSupabase,
} from '../../internal/testing/supabase.js'
import type { TwitchFetcher } from '../fetcher.js'
import { syncTwitchUsers } from '../sync-accounts.js'
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
): TwitchUser {
  return {
    broadcaster_type: '',
    created_at: '2020-01-01T00:00:00Z',
    description: '',
    display_name: displayName,
    id,
    login,
    offline_image_url: '',
    profile_image_url: '',
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
        twitch_login_name: 'alice',
        twitch_user_id: '1001',
      },
      {
        id: 'user-row-2',
        name: 'Alice Sub',
        twitch_login_name: 'alice_sub',
        twitch_user_id: '1002',
      },
    ],
  },
]

describe('syncTwitchUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates only the accounts whose name or login changed', async () => {
    supabase.respond(({ method }) => (method === 'GET' ? savedTalents : []))
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
    supabase.respond(({ method }) => (method === 'GET' ? savedTalents : []))
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
})
