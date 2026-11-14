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
