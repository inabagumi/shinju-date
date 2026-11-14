import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestContext } from '../../internal/testing/context.js'
import {
  postgresError,
  setupSupabase,
} from '../../internal/testing/supabase.js'
import type { YouTubeFetcher } from '../fetcher.js'
import { syncYouTubeChannels } from '../sync-accounts.js'
import type { YouTubeChannel } from '../types.js'

const supabase = setupSupabase()
const reportError = vi.fn()
const createContext = <T>(fetcher: T) =>
  createTestContext({
    fetcher,
    reportError,
    supabaseClient: supabase.supabaseClient,
  })

function createChannel(
  id: string,
  title: string,
  customUrl?: string,
): YouTubeChannel {
  return {
    contentDetails: { relatedPlaylists: { uploads: `UU${id.slice(2)}` } },
    id,
    snippet: { title, ...(customUrl ? { customUrl } : {}) },
  }
}

function createFetcher(channels: YouTubeChannel[]) {
  const getAccounts = vi.fn(async () => channels)

  return { fetcher: { getAccounts } as unknown as YouTubeFetcher, getAccounts }
}

const savedTalents = [
  {
    id: 'talent-1',
    youtube_channels: [
      {
        id: 'channel-row-1',
        name: 'Alice',
        youtube_channel_id: 'UCaaa',
        youtube_handle: '@alice',
      },
    ],
  },
  {
    id: 'talent-2',
    youtube_channels: [
      {
        id: 'channel-row-2',
        name: 'Bob',
        youtube_channel_id: 'UCbbb',
        youtube_handle: null,
      },
    ],
  },
]

describe('syncYouTubeChannels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates only the channels whose name or handle changed', async () => {
    supabase.respond(({ method }) => (method === 'GET' ? savedTalents : []))
    const { getAccounts, fetcher } = createFetcher([
      createChannel('UCaaa', 'Alice', '@alice'),
      createChannel('UCbbb', 'Bob Ch.', '@bob'),
    ])

    const changed = await syncYouTubeChannels(createContext(fetcher))

    expect(changed).toBeGreaterThan(0)
    expect(getAccounts).toHaveBeenCalledWith(['UCaaa', 'UCbbb'])
    expect(supabase.written('PATCH', 'youtube_channels')).toEqual([
      expect.objectContaining({
        body: { name: 'Bob Ch.', youtube_handle: '@bob' },
        query: { id: 'eq.channel-row-2' },
      }),
    ])
  })

  it('notices a handle that changed on its own', async () => {
    supabase.respond(({ method }) => (method === 'GET' ? savedTalents : []))
    const { fetcher } = createFetcher([
      createChannel('UCaaa', 'Alice', '@alice_new'),
    ])

    const changed = await syncYouTubeChannels(createContext(fetcher))

    expect(changed).toBeGreaterThan(0)
    expect(supabase.written('PATCH', 'youtube_channels')[0]?.body).toEqual({
      name: 'Alice',
      youtube_handle: '@alice_new',
    })
  })

  it('writes nothing when every channel is up to date', async () => {
    supabase.respond(({ method }) => (method === 'GET' ? savedTalents : []))
    const { fetcher } = createFetcher([
      createChannel('UCaaa', 'Alice', '@alice'),
      createChannel('UCbbb', 'Bob'),
    ])

    const changed = await syncYouTubeChannels(createContext(fetcher))

    expect(changed).toBe(0)
    expect(supabase.requests).toHaveLength(1)
  })

  it('includes retired talents but not deleted ones', async () => {
    supabase.respond(() => [])
    const { fetcher } = createFetcher([])

    await syncYouTubeChannels(createContext(fetcher))

    expect(supabase.requests[0]?.query).toMatchObject({ deleted_at: 'is.null' })
    expect(supabase.requests[0]?.query).not.toHaveProperty('status')
  })

  it('fails when the channels cannot be loaded', async () => {
    supabase.respond(() => postgresError('42501', 'permission denied'))
    const { fetcher } = createFetcher([])

    await expect(syncYouTubeChannels(createContext(fetcher))).rejects.toThrow(
      'permission denied',
    )
  })
})
