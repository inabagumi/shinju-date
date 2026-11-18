/** PostgreSQL error code for a foreign key violation. */
const FOREIGN_KEY_VIOLATION = '23503'

interface PostgrestErrorLike {
  code?: string
  message: string
}

interface StorageErrorLike {
  message: string
}

/**
 * A query to the database failed. `operation` names what was being done, so
 * that error reports can be told apart without reading the message.
 */
export class DatabaseError extends Error {
  readonly operation: string

  constructor(operation: string, cause: PostgrestErrorLike) {
    super(`${operation}: ${cause.message}`, { cause })
    this.name = 'DatabaseError'
    this.operation = operation
  }
}

/**
 * A request to Supabase Storage failed. `operation` names what was being
 * done, like `DatabaseError`.
 */
export class StorageError extends Error {
  readonly operation: string

  constructor(operation: string, cause: StorageErrorLike) {
    super(`${operation}: ${cause.message}`, { cause })
    this.name = 'StorageError'
    this.operation = operation
  }
}

/** The result of a Supabase query: `data` on success, `error` on failure. */
interface QueryResult {
  data: unknown
  error: PostgrestErrorLike | null
}

/**
 * Returns `data` of a Supabase query, or throws `DatabaseError` when the query
 * failed.
 *
 * @param result - The result of the query.
 * @param operation - What the query does, for the message and `operation` of
 *   the error.
 * @throws {DatabaseError} When `result` has an error.
 */
export function throwIfError<Result extends QueryResult>(
  result: Result,
  operation: string,
): Extract<Result, { error: null }>['data'] {
  if (result.error) {
    throw new DatabaseError(operation, result.error)
  }

  // The type of `data` is not narrowed by checking `error` of a generic.
  return result.data as Extract<Result, { error: null }>['data']
}

export function isForeignKeyViolation(error: PostgrestErrorLike): boolean {
  return error.code === FOREIGN_KEY_VIOLATION
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
