/**
 * The account to read does not exist, or belongs to a talent that was deleted.
 */
export class AccountNotFoundError extends Error {
  constructor(accountId: string) {
    super(`Account not found: ${accountId}`);
    this.name = "AccountNotFoundError";
  }
}
