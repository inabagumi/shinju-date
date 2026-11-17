import {
  countUpdatedAccounts,
  syncAccountsWith,
} from '../internal/operations/sync-accounts.js'
import { removeUnusedProfileImages } from '../internal/profile-images/index.js'
import type { CrawlContext, SyncAccountResult } from '../types.js'
import { createYouTubeAccounts, type YouTubeChannelFields } from './accounts.js'
import type { YouTubeFetcher } from './fetcher.js'

/**
 * Deletes icons no channel or user uses any more, e.g. those of deleted
 * channels. Unused icons are never served, so a failure is only reported.
 */
async function cleanUpProfileImages({
  logger,
  now,
  reportError,
  supabaseClient,
}: CrawlContext<YouTubeFetcher>): Promise<void> {
  try {
    const removedCount = await removeUnusedProfileImages(supabaseClient, {
      now,
    })

    if (removedCount > 0) {
      logger.info('使われていないアイコンを削除しました', { removedCount })
    }
  } catch (error) {
    reportError(error, { operation: 'removeUnusedProfileImages' })
  }
}

/**
 * Brings the name, handle and icon of saved YouTube channels in line with
 * YouTube, then deletes icons that are no longer used.
 *
 * Channels of retired talents are included (deleted talents are not), and
 * `talents.name` is deliberately left alone: it is managed independently of
 * the channel name.
 *
 * @returns The number of channels updated.
 */
export async function syncYouTubeChannels(
  context: CrawlContext<YouTubeFetcher>,
): Promise<number> {
  const results = await syncAccountsWith(
    context,
    createYouTubeAccounts(context.fetcher),
  )

  await cleanUpProfileImages(context)

  return countUpdatedAccounts(results)
}

/**
 * Brings the name, handle and icon of the YouTube channels of one talent in
 * line with YouTube, the same way {@link syncYouTubeChannels} does: a channel
 * is written only when something changed.
 *
 * Unused icons are not deleted here; the scheduled sync picks them up.
 *
 * @returns One result per saved channel of the talent; empty when the talent
 *   has none or was deleted.
 * @throws When the channels cannot be loaded or YouTube cannot be read.
 */
export function syncYouTubeChannelsOfTalent(
  context: CrawlContext<YouTubeFetcher>,
  talentId: string,
): Promise<SyncAccountResult<YouTubeChannelFields>[]> {
  return syncAccountsWith(context, createYouTubeAccounts(context.fetcher), {
    talentId,
  })
}
