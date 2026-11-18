import {
  countUpdatedAccounts,
  syncAccountsWith,
} from "../internal/operations/sync-accounts.js";
import type { CrawlContext, SyncAccountResult } from "../types.js";
import { createYouTubeAccounts } from "./accounts.js";
import type { YouTubeChannelFields } from "./accounts.js";
import type { YouTubeFetcher } from "./fetcher.js";

/**
 * Brings the name, handle and icon of saved YouTube channels in line with
 * YouTube. Icons that are no longer used are deleted by
 * `Scraper#cleanUpImages`.
 *
 * Channels of retired talents are included (deleted talents are not), and
 * `talents.name` is deliberately left alone: it is managed independently of
 * the channel name.
 *
 * @returns The number of channels updated.
 */
export async function syncYouTubeChannels(
  context: CrawlContext<YouTubeFetcher>
): Promise<number> {
  return countUpdatedAccounts(
    await syncAccountsWith(context, createYouTubeAccounts(context.fetcher))
  );
}

/**
 * Brings the name, handle and icon of the YouTube channels of one talent in
 * line with YouTube, the same way {@link syncYouTubeChannels} does: a channel
 * is written only when something changed.
 *
 * Unused icons are not deleted here; `Scraper#cleanUpImages` picks them up.
 *
 * @returns One result per saved channel of the talent; empty when the talent
 *   has none or was deleted.
 * @throws When the channels cannot be loaded or YouTube cannot be read.
 */
export function syncYouTubeChannelsOfTalent(
  context: CrawlContext<YouTubeFetcher>,
  talentId: string
): Promise<SyncAccountResult<YouTubeChannelFields>[]> {
  return syncAccountsWith(context, createYouTubeAccounts(context.fetcher), {
    talentId,
  });
}
