import { describe, expect, it, vi } from 'vitest'
import { Fetcher } from '../fetcher.js'
import type {
  FetcherOptions,
  RecentVideoIdsResult,
  VideoLookupResult,
} from '../fetcher-types.js'

interface Account {
  id: string
  name: string
}

interface Video {
  id: string
  title: string
}

interface Platform {
  /** Account ID → IDs of its videos, or an error to throw when listing. */
  accounts: Record<string, string[] | Error>
  /** IDs of the videos that still exist. */
  videoIds: string[]
}

/**
 * The smallest possible platform fetcher: only the three abstract methods are
 * implemented, on top of the helpers the base class provides.
 */
class ExampleFetcher extends Fetcher<Account, Video> {
  readonly provider = 'example'

  readonly requests: string[][] = []
  readonly #platform: Platform

  constructor(platform: Platform, options?: FetcherOptions) {
    super(options)

    this.#platform = platform
  }

  async *#lookUp<T>(ids: string[], known: string[], create: (id: string) => T) {
    this.requests.push(ids)

    for (const id of ids) {
      if (known.includes(id)) {
        yield create(id)
      }
    }
  }

  async getAccounts(accountIds: readonly string[]): Promise<Account[]> {
    const { found } = await this.fetchByIds(accountIds, 2, (ids) =>
      this.#lookUp(ids, Object.keys(this.#platform.accounts), (id) => ({
        id,
        name: `Account ${id}`,
      })),
    )

    return found
  }

  async getRecentVideoIds(
    accountIds: readonly string[],
  ): Promise<RecentVideoIdsResult> {
    const { failures, results } = await this.fetchPerAccount(
      accountIds,
      async (accountId) => {
        const videoIds = this.#platform.accounts[accountId] ?? []

        if (videoIds instanceof Error) {
          throw videoIds
        }

        return videoIds
      },
    )

    return {
      accounts: results.map(({ accountId, value }) => ({
        accountId,
        videoIds: value,
      })),
      failures,
      missingAccountIds: [],
    }
  }

  async getVideos(
    videoIds: readonly string[],
  ): Promise<VideoLookupResult<Video>> {
    const { found, missingIds } = await this.fetchByIds(videoIds, 2, (ids) =>
      this.#lookUp(ids, this.#platform.videoIds, (id) => ({
        id,
        title: `Video ${id}`,
      })),
    )

    return { missingIds, videos: found }
  }
}

describe('Fetcher', () => {
  describe('lookups by ID', () => {
    it('deduplicates IDs and requests them in batches', async () => {
      const fetcher = new ExampleFetcher({
        accounts: {},
        videoIds: ['v1', 'v2', 'v3'],
      })

      const result = await fetcher.getVideos(['v1', 'v2', 'v1', 'v3', 'v2'])

      expect(result.videos.map((video) => video.id)).toEqual(['v1', 'v2', 'v3'])
      expect(fetcher.requests).toEqual([['v1', 'v2'], ['v3']])
    })

    it('reports the IDs the platform did not return', async () => {
      const fetcher = new ExampleFetcher({ accounts: {}, videoIds: ['v1'] })

      await expect(fetcher.getVideos(['v1', 'gone'])).resolves.toEqual({
        missingIds: ['gone'],
        videos: [{ id: 'v1', title: 'Video v1' }],
      })
    })

    it('makes no request without IDs', async () => {
      const fetcher = new ExampleFetcher({ accounts: {}, videoIds: [] })

      await expect(fetcher.getAccounts([])).resolves.toEqual([])
      expect(fetcher.requests).toEqual([])
    })
  })

  describe('findMissingVideoIds', () => {
    it('is derived from getVideos by default', async () => {
      const fetcher = new ExampleFetcher({ accounts: {}, videoIds: ['v1'] })

      await expect(
        fetcher.findMissingVideoIds(['v1', 'gone-a', 'gone-b']),
      ).resolves.toEqual(['gone-a', 'gone-b'])
    })
  })

  describe('getRecentVideos', () => {
    it('is derived from getRecentVideoIds and getVideos by default', async () => {
      const fetcher = new ExampleFetcher({
        accounts: { a: ['v1', 'v2'], b: ['v3'] },
        videoIds: ['v1', 'v2', 'v3'],
      })

      const result = await fetcher.getRecentVideos(['a', 'b'])

      expect(result).toEqual({
        failures: [],
        missingAccountIds: [],
        videos: [
          { id: 'v1', title: 'Video v1' },
          { id: 'v2', title: 'Video v2' },
          { id: 'v3', title: 'Video v3' },
        ],
      })
    })

    it('keeps the accounts that worked when one fails', async () => {
      const error = new Error('rate limited')
      const fetcher = new ExampleFetcher({
        accounts: { a: error, b: ['v3'] },
        videoIds: ['v3'],
      })

      const result = await fetcher.getRecentVideos(['a', 'b'])

      expect(result.failures).toEqual([{ accountId: 'a', error }])
      expect(result.videos).toEqual([{ id: 'v3', title: 'Video v3' }])
    })
  })

  describe('failures', () => {
    it('logs the account and platform of a failed listing', async () => {
      const error = new Error('rate limited')
      const logger = {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      }

      const fetcher = new ExampleFetcher(
        { accounts: { a: error }, videoIds: [] },
        { logger },
      )

      await fetcher.getRecentVideoIds(['a'])

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch data for an account',
        { accountId: 'a', error, provider: 'example' },
      )
    })

    it('rejects a lookup when a request fails', async () => {
      class FailingFetcher extends ExampleFetcher {
        override async getVideos(
          videoIds: readonly string[],
        ): Promise<VideoLookupResult<Video>> {
          const { found, missingIds } = await this.fetchByIds(
            videoIds,
            2,
            // biome-ignore lint/correctness/useYield: a request that fails yields nothing
            async function* (): AsyncGenerator<Video> {
              throw new Error('boom')
            },
          )

          return { missingIds, videos: found }
        }
      }

      const fetcher = new FailingFetcher({ accounts: {}, videoIds: [] })

      await expect(fetcher.getVideos(['v1'])).rejects.toThrow('boom')
      await expect(fetcher.findMissingVideoIds(['v1'])).rejects.toThrow('boom')
    })
  })

  describe('concurrency', () => {
    it('is shared by every method of a fetcher', async () => {
      let running = 0
      let peak = 0

      class SlowFetcher extends ExampleFetcher {
        override async getRecentVideoIds(
          accountIds: readonly string[],
        ): Promise<RecentVideoIdsResult> {
          const { failures } = await this.fetchPerAccount(
            accountIds,
            async () => {
              running++
              peak = Math.max(peak, running)
              await new Promise((resolve) => setTimeout(resolve, 5))
              running--
            },
          )

          return { accounts: [], failures, missingAccountIds: [] }
        }
      }

      const fetcher = new SlowFetcher(
        { accounts: {}, videoIds: [] },
        { concurrency: 2 },
      )

      await Promise.all([
        fetcher.getRecentVideoIds(['a', 'b', 'c']),
        fetcher.getRecentVideoIds(['d', 'e', 'f']),
      ])

      expect(peak).toBe(2)
    })
  })
})
