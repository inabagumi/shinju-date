/** PostgreSQL error code for a unique constraint violation. */
const UNIQUE_VIOLATION = '23505'

interface PostgrestErrorLike {
  code?: string
  message: string
}

export class DatabaseError extends Error {
  constructor(operation: string, cause: PostgrestErrorLike) {
    super(`${operation}: ${cause.message}`, { cause })
    this.name = 'DatabaseError'
  }
}

export function isUniqueViolation(error: PostgrestErrorLike): boolean {
  return error.code === UNIQUE_VIOLATION
}

/**
 * The account to read does not exist, or belongs to a talent that was deleted.
 */
export class AccountNotFoundError extends Error {
  constructor(accountId: string) {
    super(`Account not found: ${accountId}`)
    this.name = 'AccountNotFoundError'
  }
}

/**
 * The platform returned the cursor it was asked for as the next one, so
 * reading on would request the same page forever.
 */
export class StalledPaginationError extends Error {
  constructor(accountId: string, cursor: string) {
    super(`Pagination did not advance for ${accountId} (cursor: ${cursor})`)
    this.name = 'StalledPaginationError'
  }
}
