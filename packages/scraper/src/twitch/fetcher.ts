import {
  getClips,
  getStreamsByUserIds,
  getUsers,
  getVideos,
  getVideosByUser,
  getVideosByUserPage,
  TWITCH_API_MAX_RESULTS,
} from "@shinju-date/twitch-api-client";

import { unique } from "../internal/batch.js";
import type {
  RecentVideosResult,
  VideoLookupResult,
} from "../internal/fetcher-types.js";
import { DEFAULT_RECENT_VIDEOS_LIMIT, Fetcher } from "../internal/fetcher.js";
import type {
  ClipLookupResult,
  TwitchApi,
  TwitchFetcherOptions,
  TwitchRecentVideosOptions,
  TwitchStream,
  TwitchUser,
  TwitchVideo,
  TwitchVideoFilter,
  TwitchVideoPage,
} from "./types.js";

const defaultClient: TwitchApi = {
  getClips,
  getStreamsByUserIds,
  getUsers,
  getVideos,
  getVideosByUser,
  getVideosByUserPage,
};

/**
 * Reads users, videos, clips and live streams from the Twitch Helix API.
 * An account is a Twitch user, identified by its Helix user ID.
 *
 * Besides what every fetcher offers it knows two things only Twitch has: the
 * streams that are on air ({@link getLiveStreams}) and clips
 * ({@link getClips}).
 */
export class TwitchFetcher extends Fetcher<
  TwitchUser,
  TwitchVideo,
  TwitchVideo,
  TwitchRecentVideosOptions
> {
  readonly provider = "twitch";

  readonly #client: TwitchApi;

  constructor({ client, ...options }: TwitchFetcherOptions = {}) {
    super(options);

    this.#client = client ?? defaultClient;
  }

  /**
   * Gets users by Helix user ID.
   */
  async getAccounts(accountIds: readonly string[]): Promise<TwitchUser[]> {
    const { found } = await this.fetchByIds(accountIds, (ids) =>
      this.#client.getUsers({ ids, schedule: this.request })
    );

    return found;
  }

  /**
   * Lists the newest videos of each broadcaster.
   *
   * Helix returns full videos when listing, so this takes no second request.
   * It cannot tell an unknown broadcaster from one without videos.
   */
  async getRecentVideos(
    accountIds: readonly string[],
    {
      limit = DEFAULT_RECENT_VIDEOS_LIMIT,
      type = "archive",
    }: TwitchRecentVideosOptions = {}
  ): Promise<RecentVideosResult<TwitchVideo>> {
    const { failures, results } = await this.fetchPerAccount(
      accountIds,
      (userId) =>
        Array.fromAsync(this.#client.getVideosByUser({ limit, type, userId }))
    );

    return { failures, videos: results.flatMap(({ value }) => value) };
  }

  /**
   * Gets one page of a broadcaster's videos, newest first, to walk its whole
   * history. Pass the returned cursor to read the next page.
   */
  getVideoPage(
    accountId: string,
    {
      cursor,
      type = "all",
    }: { cursor?: string | null | undefined; type?: TwitchVideoFilter } = {}
  ): Promise<TwitchVideoPage> {
    return this.request(() =>
      this.#client.getVideosByUserPage({
        after: cursor ?? undefined,
        limit: TWITCH_API_MAX_RESULTS,
        type,
        userId: accountId,
      })
    );
  }

  /**
   * Gets videos (archive / highlight / upload) by ID. Clips are a different
   * resource: see {@link getClips}.
   */
  async getVideos(
    videoIds: readonly string[]
  ): Promise<VideoLookupResult<TwitchVideo>> {
    const { found, missingIds } = await this.fetchByIds(videoIds, (ids) =>
      this.#client.getVideos({ ids, schedule: this.request })
    );

    return { missingIds, videos: found };
  }

  /**
   * Gets the streams that are live right now for the given broadcasters.
   * Offline broadcasters are omitted (Helix does not return them).
   */
  getLiveStreams(accountIds: readonly string[]): Promise<TwitchStream[]> {
    return Array.fromAsync(
      this.#client.getStreamsByUserIds({
        schedule: this.request,
        userIds: unique(accountIds),
      })
    );
  }

  /**
   * Gets clips by ID (slug) and reports the IDs Helix did not return.
   */
  async getClips(clipIds: readonly string[]): Promise<ClipLookupResult> {
    const { found, missingIds } = await this.fetchByIds(clipIds, (ids) =>
      this.#client.getClips({ ids, schedule: this.request })
    );

    return { clips: found, missingIds };
  }
}
