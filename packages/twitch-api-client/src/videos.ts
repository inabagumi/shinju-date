import { paginate } from '@shinju-date/helpers'
import {
  type BatchOptions,
  lookupByIds,
  requestInBatches,
  TWITCH_API_MAX_RESULTS,
} from './batches.js'
import { type ClientOptions, getTwitchApiClient } from './client.js'
import { mapVideo } from './mappers.js'
import type {
  TwitchVideo,
  TwitchVideoFilter,
  TwitchVideoPage,
} from './types.js'

interface GetVideosOptions extends ClientOptions, BatchOptions {
  ids: string[]
}

interface GetVideosByUserOptions extends ClientOptions {
  /** Drain every page when true (default: first page only). */
  all?: boolean
  /** Page size, up to 100. Defaults to 100 when `all` is set, 20 otherwise. */
  limit?: number
  type?: TwitchVideoFilter
  userId: string
}

interface GetVideosByUserPageOptions extends ClientOptions {
  /** Cursor returned by the previous page; omit for the newest videos. */
  after?: string | undefined
  /** Page size, up to 100 (default: 100). */
  limit?: number
  type?: TwitchVideoFilter
  userId: string
}

/**
 * Gets Twitch videos (VOD / highlight / upload) by ID.
 * IDs that no longer exist are omitted.
 */
export async function* getVideos({
  client = getTwitchApiClient(),
  ids,
  schedule,
}: GetVideosOptions): AsyncGenerator<TwitchVideo, void, undefined> {
  for await (const video of requestInBatches(ids, schedule, (batch, run) =>
    lookupByIds(batch, (batchIds) =>
      run(() => client.videos.getVideosByIds(batchIds)),
    ),
  )) {
    const mapped = mapVideo(video)
    if (mapped) {
      yield mapped
    }
  }
}

/**
 * Gets videos for a broadcaster, newest first (for batch discovery).
 * Returns the first page by default; pass `all: true` to drain all pages.
 */
export async function* getVideosByUser({
  all = false,
  client = getTwitchApiClient(),
  limit = all ? TWITCH_API_MAX_RESULTS : 20,
  type = 'archive',
  userId,
}: GetVideosByUserOptions): AsyncGenerator<TwitchVideo, void, undefined> {
  if (!all) {
    const { videos } = await getVideosByUserPage({
      client,
      limit,
      type,
      userId,
    })

    yield* videos

    return
  }

  yield* paginate(async (after) => {
    const { cursor, videos } = await getVideosByUserPage({
      after,
      client,
      limit,
      type,
      userId,
    })

    return { items: videos, next: cursor }
  })
}

/**
 * Gets one page of a broadcaster's videos, newest first.
 *
 * Unlike {@link getVideosByUser} with `all`, the caller keeps the cursor, so a
 * long history can be walked across several runs.
 */
export async function getVideosByUserPage({
  after,
  client = getTwitchApiClient(),
  limit = TWITCH_API_MAX_RESULTS,
  type = 'archive',
  userId,
}: GetVideosByUserPageOptions): Promise<TwitchVideoPage> {
  const { cursor, data } = await client.videos.getVideosByUser(userId, {
    limit,
    type,
    ...(after ? { after } : {}),
  })

  return {
    // Helix may still return a cursor along with the last page; the empty
    // page that follows it ends the walk.
    cursor: data.length > 0 && cursor ? cursor : null,
    videos: data.flatMap((video) => {
      const mapped = mapVideo(video)
      return mapped ? [mapped] : []
    }),
  }
}
