import {
  countUpdatedAccounts,
  syncAccountsWith,
} from '../internal/operations/sync-accounts.js'
import type { CrawlContext, SyncAccountResult } from '../types.js'
import { createTwitchAccounts, type TwitchUserFields } from './accounts.js'
import type { TwitchFetcher } from './fetcher.js'

/**
 * Brings the display name, login and icon of saved Twitch accounts in line
 * with Twitch. Accounts of retired talents are included (deleted talents are
 * not).
 *
 * Icons that are no longer used are deleted by `Scraper#cleanUpImages`.
 *
 * @returns The number of accounts updated.
 */
export async function syncTwitchUsers(
  context: CrawlContext<TwitchFetcher>,
): Promise<number> {
  return countUpdatedAccounts(
    await syncAccountsWith(context, createTwitchAccounts(context.fetcher)),
  )
}

/**
 * Brings the display name, login and icon of the Twitch accounts of one
 * talent in line with Twitch, the same way {@link syncTwitchUsers} does: an
 * account is written only when something changed.
 *
 * @returns One result per saved account of the talent; empty when the talent
 *   has none or was deleted.
 * @throws When the accounts cannot be loaded or Twitch cannot be read.
 */
export function syncTwitchUsersOfTalent(
  context: CrawlContext<TwitchFetcher>,
  talentId: string,
): Promise<SyncAccountResult<TwitchUserFields>[]> {
  return syncAccountsWith(context, createTwitchAccounts(context.fetcher), {
    talentId,
  })
}
