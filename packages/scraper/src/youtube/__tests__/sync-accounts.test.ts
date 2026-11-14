import type { youtube_v3 as youtube } from '@googleapis/youtube'
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
  thumbnails?: youtube.Schema$ThumbnailDetails,
): YouTubeChannel {
  return {
    contentDetails: { relatedPlaylists: { uploads: `UU${id.slice(2)}` } },
    id,
    snippet: {
      title,
      ...(customUrl ? { customUrl } : {}),
      ...(thumbnails ? { thumbnails } : {}),
    },
  }
}

function createThumbnails(url: string): youtube.Schema$ThumbnailDetails {
  return { high: { height: 800, url, width: 800 } }
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
        profile_images: null,
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
        profile_images: null,
        youtube_channel_id: 'UCbbb',
        youtube_handle: null,
      },
    ],
  },
]

/**
 * A database holding `savedTalents` and no unused icons, in which every write
 * succeeds.
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

    return method === 'PATCH' && table === 'youtube_channels'
      ? [{ id: 'channel-row' }]
      : []
  })
}

describe('syncYouTubeChannels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates only the channels whose name or handle changed', async () => {
    respondWithSavedTalents()
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
    respondWithSavedTalents()
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
    respondWithSavedTalents()
    const { fetcher } = createFetcher([
      createChannel('UCaaa', 'Alice', '@alice'),
      createChannel('UCbbb', 'Bob'),
    ])

    const changed = await syncYouTubeChannels(createContext(fetcher))

    expect(changed).toBe(0)
    expect(
      supabase.requests.map(({ method, table }) => `${method} ${table}`),
    ).toEqual(['GET talents', 'GET profile_images'])
  })

  it('loads the saved icon of every channel', async () => {
    respondWithSavedTalents()
    const { fetcher } = createFetcher([])

    await syncYouTubeChannels(createContext(fetcher))

    expect(supabase.requests[0]?.query['select']).toContain(
      'profile_images(id,path,etag,source_url)',
    )
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

  describe('icons', () => {
    const ICON_URL = 'https://yt3.ggpht.com/alice=s800-c-k-c0x00ffffff-no-rj'

    let image: Buffer

    beforeAll(async () => {
      image = await createImage(800, 800)
    })

    it('stores the icon of a channel that has none yet', async () => {
      serveImage(supabase, ICON_URL, { body: image })
      const storage = mockStorage(supabase)
      respondWithSavedTalents()
      const { fetcher } = createFetcher([
        createChannel('UCaaa', 'Alice', '@alice', createThumbnails(ICON_URL)),
      ])

      const changed = await syncYouTubeChannels(createContext(fetcher))

      const inserted = supabase.written('POST', 'profile_images')[0]?.body as {
        id: string
        source_url: string
      }

      expect(changed).toBe(1)
      expect(storage.uploads).toHaveLength(1)
      expect(inserted.source_url).toBe(ICON_URL)
      expect(supabase.written('PATCH', 'youtube_channels')).toEqual([
        expect.objectContaining({
          body: { profile_image_id: inserted.id },
          query: { id: 'eq.channel-row-1', select: 'id' },
        }),
      ])
      expect(reportError).not.toHaveBeenCalled()
    })

    it('leaves an icon alone when YouTube serves the same one', async () => {
      const requests = serveImage(supabase, ICON_URL, { body: image })
      const storage = mockStorage(supabase)
      respondWithSavedTalents(({ method, table }) =>
        method === 'GET' && table === 'talents'
          ? [
              {
                id: 'talent-1',
                youtube_channels: [
                  {
                    ...savedTalents[0]?.youtube_channels[0],
                    profile_images: {
                      etag: '"etag-1"',
                      id: 'image-1',
                      path: 'youtube/UCaaa/icon.webp',
                      source_url: ICON_URL,
                    },
                  },
                ],
              },
            ]
          : undefined,
      )
      const { fetcher } = createFetcher([
        createChannel('UCaaa', 'Alice', '@alice', createThumbnails(ICON_URL)),
      ])

      const changed = await syncYouTubeChannels(createContext(fetcher))

      expect(changed).toBe(0)
      expect(requests).toEqual([{ ifNoneMatch: '"etag-1"', url: ICON_URL }])
      expect(storage.uploads).toHaveLength(0)
      expect(supabase.written('PATCH', 'youtube_channels')).toHaveLength(0)
    })

    it('still syncs the name when the icon cannot be stored', async () => {
      serveImage(supabase, ICON_URL, {
        body: Buffer.from('not found'),
        contentType: 'text/plain',
      })
      mockStorage(supabase)
      respondWithSavedTalents()
      const { fetcher } = createFetcher([
        createChannel('UCbbb', 'Bob Ch.', '@bob', createThumbnails(ICON_URL)),
      ])

      const changed = await syncYouTubeChannels(createContext(fetcher))

      expect(changed).toBe(1)
      expect(supabase.written('PATCH', 'youtube_channels')).toEqual([
        expect.objectContaining({
          body: { name: 'Bob Ch.', youtube_handle: '@bob' },
        }),
      ])
      expect(supabase.written('POST', 'profile_images')).toHaveLength(0)
      expect(reportError).toHaveBeenCalledWith(expect.any(TypeError), {
        operation: 'syncProfileImage',
        youtubeChannelId: 'UCbbb',
      })
    })

    it('deletes icons that are no longer used', async () => {
      const storage = mockStorage(supabase)
      respondWithSavedTalents(({ method, table }) =>
        method === 'GET' && table === 'profile_images'
          ? [{ id: 'image-9', path: 'youtube/UCzzz/gone.webp' }]
          : undefined,
      )
      const { fetcher } = createFetcher([])

      await syncYouTubeChannels(createContext(fetcher))

      expect(supabase.written('DELETE', 'profile_images')[0]?.query).toEqual({
        id: 'eq.image-9',
      })
      expect(storage.removed).toEqual([['youtube/UCzzz/gone.webp']])
    })

    it('reports a failed clean-up without failing the sync', async () => {
      respondWithSavedTalents(({ method, table }) =>
        method === 'GET' && table === 'profile_images'
          ? postgresError('42501', 'permission denied')
          : undefined,
      )
      const { fetcher } = createFetcher([
        createChannel('UCbbb', 'Bob Ch.', '@bob'),
      ])

      await expect(syncYouTubeChannels(createContext(fetcher))).resolves.toBe(1)
      expect(reportError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('denied') }),
        { operation: 'removeUnusedProfileImages' },
      )
    })
  })
})
