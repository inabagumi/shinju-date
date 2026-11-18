import type {
  AddPastVideosOptions,
  AddPastVideosResult,
  CrawlContext,
} from "../../types.js";
import { AccountNotFoundError } from "../account-not-found-error.js";
import { BACKFILL_SAVE_CONCURRENCY } from "../constants.js";
import { findAccount } from "../database/talents.js";
import type { AccountTable, TalentAccount } from "../database/talents.js";
import { StalledPaginationError } from "../stalled-pagination-error.js";

/** One page of the videos of an account, newest first. */
export interface PastVideoPage<TListed> {
  /** Where the next page starts, or `null` after the last page. */
  cursor: string | null;
  /** What the platform listed on the page. */
  listed: readonly TListed[];
}

/**
 * What differs between the platforms when the past videos of an account are
 * added: where the account is saved, how a page of its videos is read and how
 * the listed videos that are not saved yet are saved.
 *
 * @template TFetcher - The fetcher of the platform.
 * @template TListed - What a page lists: the ID of a video, or the video
 *   itself when the platform lists videos with their details.
 */
export interface PastVideoAdapter<TFetcher, TListed> {
  accountTable: AccountTable;
  /**
   * Reads one page of the videos of the account, newest first.
   *
   * @returns The page, or `null` when the platform does not have the account.
   */
  getPage: (
    context: CrawlContext<TFetcher>,
    account: TalentAccount,
    cursor: string | null | undefined
  ) => Promise<PastVideoPage<TListed> | null>;
  /**
   * Saves the listed videos that are not saved yet, the same way the
   * discovery of new videos saves them. Saved videos are left alone.
   *
   * @param concurrency - Videos saved at once.
   * @returns The number of videos added.
   */
  saveNew: (
    context: CrawlContext<TFetcher>,
    account: TalentAccount,
    listed: readonly TListed[],
    concurrency: number
  ) => Promise<number>;
}

/**
 * Reads one page of the history of an account, newest first, and saves the
 * videos on it that are not saved yet.
 *
 * Unlike the discovery of new videos, which only looks at the newest videos,
 * this walks the whole history page by page so that videos from before the
 * account was tracked can be added. Call it again with the returned cursor
 * until it is `null`.
 *
 * @throws {AccountNotFoundError} When the account is not saved, its talent
 *   was deleted, or `getPage` reports that the platform does not have it.
 * @throws {StalledPaginationError} When the platform returns the requested
 *   cursor as the next one.
 */
export const addPastVideosWith = async <TFetcher, TListed>(
  context: CrawlContext<TFetcher>,
  adapter: PastVideoAdapter<TFetcher, TListed>,
  { accountId, cursor }: Pick<AddPastVideosOptions, "accountId" | "cursor">
): Promise<AddPastVideosResult> => {
  const account = await findAccount(
    context.supabaseClient,
    adapter.accountTable,
    accountId
  );

  if (!account) {
    throw new AccountNotFoundError(accountId);
  }

  const page = await adapter.getPage(context, account, cursor);

  if (!page) {
    throw new AccountNotFoundError(accountId);
  }

  if (cursor && page.cursor === cursor) {
    throw new StalledPaginationError(accountId, cursor);
  }

  const added = await adapter.saveNew(
    context,
    account,
    page.listed,
    BACKFILL_SAVE_CONCURRENCY
  );

  return { added, cursor: page.cursor, listed: page.listed.length };
};
