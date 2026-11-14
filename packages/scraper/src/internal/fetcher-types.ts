import type { Logger } from './logger.js'

export interface FetcherOptions {
  /** Maximum number of API requests in flight (default: 5). */
  concurrency?: number | undefined
  logger?: Logger | undefined
}

export interface RecentVideosOptions {
  /** How many of the newest videos to list per account (default: 20). */
  limit?: number
}

/** An account whose videos could not be listed. */
export interface AccountFailure {
  accountId: string
  error: unknown
}

/** The newest videos of one account, newest first. */
export interface AccountVideoIds {
  accountId: string
  videoIds: string[]
}

export interface RecentVideoIdsResult {
  accounts: AccountVideoIds[]
  /** Accounts that failed; the other accounts are still returned. */
  failures: AccountFailure[]
  /** Requested accounts the platform does not know (deleted or terminated). */
  missingAccountIds: string[]
}

export interface RecentVideosResult<TVideo> {
  /** Accounts that failed; the other accounts are still returned. */
  failures: AccountFailure[]
  /** Requested accounts the platform does not know (deleted or terminated). */
  missingAccountIds: string[]
  videos: TVideo[]
}

export interface VideoLookupResult<TVideo> {
  /** Requested IDs the platform did not return (deleted or made private). */
  missingIds: string[]
  videos: TVideo[]
}
