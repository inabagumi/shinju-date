import { BACKFILL_SAVE_CONCURRENCY } from '../internal/concurrency.js'
import {
  AccountNotFoundError,
  findYouTubeChannel,
} from '../internal/database/index.js'
import type {
  AddPastVideosOptions,
  AddPastVideosResult,
  CrawlContext,
} from '../types.js'
import { saveNewYouTubeVideos } from './add-new-videos.js'
import type { YouTubeFetcher } from './fetcher.js'

/**
 * Reads one page of a YouTube channel's uploads, newest first, and saves the
 * videos that are not saved yet. Videos that are saved already are left
 * alone.
 *
 * Unlike the discovery of new videos, which only looks at the newest uploads,
 * this walks the whole uploads playlist page by page so that videos from
 * before the channel was tracked can be added. Call it again with the
 * returned cursor until it is `null`.
 *
 * @throws {AccountNotFoundError} When the channel does not exist (in the
 *   database or on YouTube) or its talent was deleted.
 */
export async function addPastYouTubeVideos(
  context: CrawlContext<YouTubeFetcher>,
  { accountId, cursor }: Pick<AddPastVideosOptions, 'accountId' | 'cursor'>,
): Promise<AddPastVideosResult> {
  const { fetcher, supabaseClient } = context
  const channel = await findYouTubeChannel(supabaseClient, accountId)

  if (!channel) {
    throw new AccountNotFoundError(accountId)
  }

  const page = await fetcher.getUploadPage(channel.youtubeChannelId, {
    cursor,
  })

  if (!page) {
    throw new AccountNotFoundError(accountId)
  }

  const added = await saveNewYouTubeVideos(
    context,
    new Map(page.videoIds.map((videoId) => [videoId, channel])),
    BACKFILL_SAVE_CONCURRENCY,
  )

  return { added, cursor: page.cursor, listed: page.videoIds.length }
}
