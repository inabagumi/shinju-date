export { AccountNotFoundError } from "./internal/account-not-found-error.js";
export { DatabaseError } from "./internal/database-error.js";
export { throwIfError } from "./internal/errors.js";
export { StalledPaginationError } from "./internal/stalled-pagination-error.js";
export { StorageError } from "./internal/storage-error.js";
export { Scraper } from "./scraper.js";
export type {
  AccountChanges,
  AccountFields,
  AddPastVideosOptions,
  AddPastVideosResult,
  ErrorReporter,
  Logger,
  RefreshVideoResult,
  ScraperOptions,
  SyncAccountResult,
  TypedSupabaseClient,
  VideoFields,
} from "./types.js";
