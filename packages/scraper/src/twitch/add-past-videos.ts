import { TWITCH_USERS } from '../internal/database/index.js'
import {
  addPastVideosWith,
  type PastVideoAdapter,
} from '../internal/operations/add-past-videos.js'
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
 * Describes Twitch to the backfill: a page lists whole videos, and archives
 * are attached to the broadcasts the live sync already tracks, the same way
 * the discovery of new videos does.
 */
const TWITCH_PAST_VIDEOS: PastVideoAdapter<TwitchFetcher, TwitchVideo> = {
  accountTable: TWITCH_USERS,
  async getPage({ fetcher }, user, cursor) {
    const page = await fetcher.getVideoPage(user.platformId, {
      cursor,
      type: 'all',
    })

    return { cursor: page.cursor, listed: page.videos }
  },
  async saveNew(context, user, listed, concurrency) {
    const videos = listed.filter((video) => SAVED_TYPES.has(video.type))

    // The archive of a broadcast that is still on air must keep its row LIVE.
    const liveStreams =
      videos.length > 0
        ? await context.fetcher.getLiveStreams([user.platformId])
        : []

    return saveNewTwitchVideos(context, {
      concurrency,
      liveStreams,
      users: [user],
      videos,
    })
  },
}

/**
 * Reads one page of a Twitch account's videos, newest first, and saves the
 * ones that are not saved yet. Videos that are saved already are left alone.
 * Call it again with the returned cursor until it is `null`.
 *
 * @throws {AccountNotFoundError} When the account does not exist or its
 *   talent was deleted.
 * @throws {StalledPaginationError} When Twitch returns the requested cursor
 *   as the next one.
 */
export function addPastTwitchVideos(
  context: CrawlContext<TwitchFetcher>,
  options: Pick<AddPastVideosOptions, 'accountId' | 'cursor'>,
): Promise<AddPastVideosResult> {
  return addPastVideosWith(context, TWITCH_PAST_VIDEOS, options)
}
