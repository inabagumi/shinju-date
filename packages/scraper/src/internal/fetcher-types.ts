import type { Logger } from "./logger.js";

export interface FetcherOptions {
  /** Maximum number of API requests in flight (default: 5). */
  concurrency?: number | undefined;
  logger?: Logger | undefined;
}

export interface RecentVideosOptions {
  /** How many of the newest videos to list per account (default: 20). */
  limit?: number;
}

/** An account whose videos could not be listed. */
export interface AccountFailure {
  accountId: string;
  error: unknown;
}

export interface RecentVideosResult<TRecentVideo> {
  /** Accounts that failed; the other accounts are still returned. */
  failures: AccountFailure[];
  /** The newest videos of the accounts that worked, newest first per account. */
  videos: TRecentVideo[];
}

export interface VideoLookupResult<TVideo> {
  /** Requested IDs the platform did not return (deleted or made private). */
  missingIds: string[];
  videos: TVideo[];
}
