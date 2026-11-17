import { vi } from 'vitest'
import type { TwitchFetcher } from '../../twitch/fetcher.js'
import type {
  TwitchClip,
  TwitchRecentVideosOptions,
  TwitchStream,
  TwitchUser,
  TwitchVideo,
} from '../../twitch/types.js'
import type { Fetcher } from '../fetcher.js'
import type { AccountFailure, AccountVideoIds } from '../fetcher-types.js'

interface Resource {
  id: string
}

type AnyFetcher = Fetcher<Resource, Resource>

type AccountOf<TFetcher extends AnyFetcher> = Awaited<
  ReturnType<TFetcher['getAccounts']>
>[number]

type VideoOf<TFetcher extends AnyFetcher> = Awaited<
  ReturnType<TFetcher['getVideos']>
>['videos'][number]

export interface FakeFetcherOptions<TAccount, TVideo> {
  /** Accounts the platform knows; `getAccounts` returns the requested ones. */
  accounts?: TAccount[]
  /** Accounts whose newest videos cannot be listed. */
  failures?: AccountFailure[]
  /** Videos the platform no longer has (deleted or made private). */
  missingVideoIds?: string[]
  /** What `getRecentVideoIds` lists for each account. */
  recentVideoIds?: AccountVideoIds[]
  /** Videos the platform has; `getVideos` returns the requested ones. */
  videos?: TVideo[]
}

function pick<T extends Resource>(
  items: readonly T[],
  ids: readonly string[],
): T[] {
  return items.filter((item) => ids.includes(item.id))
}

function createFakeMethods<TAccount extends Resource, TVideo extends Resource>({
  accounts = [],
  failures = [],
  missingVideoIds = [],
  recentVideoIds = [],
  videos = [],
}: FakeFetcherOptions<TAccount, TVideo>) {
  const findMissing = (videoIds: readonly string[]) =>
    missingVideoIds.filter((id) => videoIds.includes(id))

  return {
    findMissingVideoIds: vi.fn(async (videoIds: readonly string[]) =>
      findMissing(videoIds),
    ),
    getAccounts: vi.fn(async (accountIds: readonly string[]) =>
      pick(accounts, accountIds),
    ),
    getRecentVideoIds: vi.fn(
      async (_accountIds: readonly string[], _options?: unknown) => ({
        accounts: recentVideoIds,
        failures,
        missingAccountIds: [] as string[],
      }),
    ),
    getVideos: vi.fn(async (videoIds: readonly string[]) => ({
      missingIds: findMissing(videoIds),
      videos: pick(videos, videoIds),
    })),
  }
}

/**
 * Stands in for the fetcher of a platform. What it returns is given by the
 * options, and every method is a mock to assert on how it was called:
 *
 * ```ts
 * const { fetcher, getVideos } = createFakeFetcher<YouTubeFetcher>({
 *   videos: [createVideo({ id: 'a' })],
 * })
 * ```
 */
export function createFakeFetcher<TFetcher extends AnyFetcher>(
  options: FakeFetcherOptions<AccountOf<TFetcher>, VideoOf<TFetcher>> = {},
) {
  const methods = createFakeMethods(options)

  return { ...methods, fetcher: methods as unknown as TFetcher }
}

export interface FakeTwitchFetcherOptions
  extends FakeFetcherOptions<TwitchUser, TwitchVideo> {
  /** Archives `getRecentVideos` lists; `failures` apply to these. */
  archives?: TwitchVideo[]
  /** Clips Twitch has; `getClips` returns the requested ones. */
  clips?: TwitchClip[]
  /** Streams `getLiveStreams` returns. */
  liveStreams?: TwitchStream[]
  /** Clips Twitch no longer has. */
  missingClipIds?: string[]
  /** Uploads `getRecentVideos` lists with `type: 'upload'`. */
  uploads?: TwitchVideo[]
}

/**
 * {@link createFakeFetcher} with the calls only Twitch has: live streams,
 * clips and the newest videos by type.
 */
export function createFakeTwitchFetcher({
  archives = [],
  clips = [],
  liveStreams = [],
  missingClipIds = [],
  uploads = [],
  ...options
}: FakeTwitchFetcherOptions = {}) {
  const { failures = [] } = options
  const methods = {
    ...createFakeMethods(options),
    getClips: vi.fn(async (clipIds: readonly string[]) => ({
      clips: pick(clips, clipIds),
      missingIds: missingClipIds.filter((id) => clipIds.includes(id)),
    })),
    getLiveStreams: vi.fn(async (_userIds: readonly string[]) => liveStreams),
    getRecentVideos: vi.fn(
      async (
        _userIds: readonly string[],
        { type }: TwitchRecentVideosOptions = {},
      ) =>
        type === 'upload'
          ? { failures: [], missingAccountIds: [], videos: uploads }
          : { failures, missingAccountIds: [], videos: archives },
    ),
  }

  return { ...methods, fetcher: methods as unknown as TwitchFetcher }
}
