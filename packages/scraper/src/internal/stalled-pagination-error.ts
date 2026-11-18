/**
 * The platform returned the cursor it was asked for as the next one, so
 * reading on would request the same page forever.
 */
export class StalledPaginationError extends Error {
  constructor(accountId: string, cursor: string) {
    super(`Pagination did not advance for ${accountId} (cursor: ${cursor})`);
    this.name = "StalledPaginationError";
  }
}
