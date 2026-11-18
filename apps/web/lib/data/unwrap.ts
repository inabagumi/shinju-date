import type { PostgrestError } from '@supabase/supabase-js'

/**
 * The error thrown when the data of the public site cannot be fetched. The
 * error of Supabase is kept in `cause`.
 */
export class DataFetchError extends Error {
  override name = 'DataFetchError'

  /** What was being fetched, the name of the fetcher */
  readonly operation: string

  constructor(operation: string, error: PostgrestError) {
    super(`${operation}: ${error.message}`, { cause: error })

    this.operation = operation
  }
}

/**
 * The result of a query of Supabase. The data of a failed query is not typed,
 * so `T` is inferred from the data of a successful one only.
 */
type QueryResult<T> = { data: T; error: null } | { error: PostgrestError }

/**
 * Return the data of the result of a query, or throw a `DataFetchError` named
 * after `operation` when the query failed.
 */
export function unwrap<T>(result: QueryResult<T>, operation: string): T {
  if (result.error) {
    throw new DataFetchError(operation, result.error)
  }

  return result.data
}
