import { BACKFILL_SAVE_CONCURRENCY } from '../internal/concurrency.js'
import {
  AccountNotFoundError,
  findTwitchUser,
  StalledPaginationError,
} from '../internal/database/index.js'
import type {
  AddPastVideosOptions,
  AddPastVideosResult,
  CrawlContext,
} from '../types.js'
import { saveNewTwitchVideos } from './add-new-videos.js'
import type { TwitchFetcher } from './fetcher.js'
import type { TwitchVideo } from './types.js'

/**
 * Kinds of videos saved, the same as the discovery of new videos: highlights
 * are cut from archives that are saved already.
 */
const SAVED_TYPES: ReadonlySet<TwitchVideo['type']> = new Set([
  'archive',
  'upload',
])

/**
 * Reads one page of a Twitch account's videos, newest first, and saves the
 * ones that are not saved yet. Videos that are saved already are left alone.
 *
 * Unlike the discovery of new videos, which only looks at the newest page,
 * this walks the whole history page by page so that videos from before the
 * account was tracked can be added. Call it again with the returned cursor
 * until it is `null`.
 *
 * @throws {AccountNotFoundError} When the account does not exist or its
 *   talent was deleted.
 * @throws {StalledPaginationError} When Twitch returns the requested cursor
 *   as the next one.
 */
export async function addPastTwitchVideos(
  context: CrawlContext<TwitchFetcher>,
  { accountId, cursor }: Pick<AddPastVideosOptions, 'accountId' | 'cursor'>,
): Promise<AddPastVideosResult> {
  const { fetcher, supabaseClient } = context
  const user = await findTwitchUser(supabaseClient, accountId)

  if (!user) {
    throw new AccountNotFoundError(accountId)
  }

  const page = await fetcher.getVideoPage(user.twitchUserId, {
    cursor,
    type: 'all',
  })

  if (cursor && page.cursor === cursor) {
    throw new StalledPaginationError(accountId, cursor)
  }

  const videos = page.videos.filter((video) => SAVED_TYPES.has(video.type))

  // The archive of a broadcast that is still on air must keep its row LIVE.
  const liveStreams =
    videos.length > 0 ? await fetcher.getLiveStreams([user.twitchUserId]) : []
  const added = await saveNewTwitchVideos(context, {
    concurrency: BACKFILL_SAVE_CONCURRENCY,
    liveStreams,
    users: [user],
    videos,
  })

  return { added, cursor: page.cursor, listed: page.videos.length }
}
