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
import type { AccountFailure } from '../fetcher-types.js'

interface Resource {
  id: string
}

type AnyFetcher = Fetcher<Resource, Resource, unknown>

type AccountOf<TFetcher extends AnyFetcher> = Awaited<
  ReturnType<TFetcher['getAccounts']>
>[number]

type VideoOf<TFetcher extends AnyFetcher> = Awaited<
  ReturnType<TFetcher['getVideos']>
>['videos'][number]

type RecentVideoOf<TFetcher extends AnyFetcher> = Awaited<
  ReturnType<TFetcher['getRecentVideos']>
>['videos'][number]

export interface FakeFetcherOptions<TAccount, TVideo, TRecentVideo = TVideo> {
  /** Accounts the platform knows; `getAccounts` returns the requested ones. */
  accounts?: TAccount[]
  /** Accounts whose newest videos cannot be listed. */
  failures?: AccountFailure[]
  /** Videos the platform no longer has (deleted or made private). */
  missingVideoIds?: string[]
  /** What `getRecentVideos` lists; `failures` apply to these. */
  recentVideos?: TRecentVideo[]
  /** Videos the platform has; `getVideos` returns the requested ones. */
  videos?: TVideo[]
}

function pick<T extends Resource>(
  items: readonly T[],
  ids: readonly string[],
): T[] {
  return items.filter((item) => ids.includes(item.id))
}

function createFakeMethods<
  TAccount extends Resource,
  TVideo extends Resource,
  TRecentVideo,
>({
  accounts = [],
  failures = [],
  missingVideoIds = [],
  recentVideos = [],
  videos = [],
}: FakeFetcherOptions<TAccount, TVideo, TRecentVideo>) {
  const findMissing = (videoIds: readonly string[]) =>
    missingVideoIds.filter((id) => videoIds.includes(id))

  return {
    findMissingVideoIds: vi.fn(async (videoIds: readonly string[]) =>
      findMissing(videoIds),
    ),
    getAccounts: vi.fn(async (accountIds: readonly string[]) =>
      pick(accounts, accountIds),
    ),
    getRecentVideos: vi.fn(
      async (_accountIds: readonly string[], _options?: unknown) => ({
        failures,
        missingAccountIds: [] as string[],
        videos: recentVideos,
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
  options: FakeFetcherOptions<
    AccountOf<TFetcher>,
    VideoOf<TFetcher>,
    RecentVideoOf<TFetcher>
  > = {},
) {
  const methods = createFakeMethods(options)

  return { ...methods, fetcher: methods as unknown as TFetcher }
}

export interface FakeTwitchFetcherOptions
  extends Omit<FakeFetcherOptions<TwitchUser, TwitchVideo>, 'recentVideos'> {
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
          ? { failures: [], videos: uploads }
          : { failures, videos: archives },
    ),
  }

  return { ...methods, fetcher: methods as unknown as TwitchFetcher }
}
