import { logger } from "@shinju-date/logger";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * The PostgREST error for `single()` when the query matches no row (or more
 * than one).
 */
export const NO_ROWS_ERROR_CODE = "PGRST116";

/**
 * The PostgreSQL error for a value that cannot be read as the column's type,
 * e.g. an ID that is not in the form of a UUID.
 */
export const INVALID_TEXT_REPRESENTATION_ERROR_CODE = "22P02";

/**
 * The PostgreSQL error for a row that breaks a unique constraint, e.g. a
 * YouTube channel that is already saved.
 */
export const UNIQUE_VIOLATION_ERROR_CODE = "23505";

const NOT_FOUND_ERROR_CODES: ReadonlySet<string> = new Set([
  NO_ROWS_ERROR_CODE,
  INVALID_TEXT_REPRESENTATION_ERROR_CODE,
]);

/**
 * Whether the error means that the requested row does not exist: no row
 * matched, or the ID could not be a row's ID at all.
 */
export const isNotFoundError = (
  error: Pick<PostgrestError, "code"> | null | undefined
): boolean =>
  error !== null &&
  error !== undefined &&
  NOT_FOUND_ERROR_CODES.has(error.code);

/** A failed Supabase query, named by the operation that ran it. */
export class QueryError extends Error {
  override readonly name = "QueryError";
  override readonly cause: PostgrestError;
  /** The error code of PostgREST or PostgreSQL. */
  readonly code: string;
  /** The name of the query that failed, e.g. `getVideo`. */
  readonly operation: string;

  constructor(operation: string, cause: PostgrestError) {
    super(`${operation}: ${cause.message}`, { cause });

    this.cause = cause;
    this.code = cause.code;
    this.operation = operation;
  }
}

/** The part of a Supabase response that `unwrap()` reads. */
export interface QueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

/** The part of a Supabase response for a `count` that `unwrapCount()` reads. */
export interface CountQueryResult {
  count: number | null;
  error: PostgrestError | null;
}

const fail = (operation: string, error: PostgrestError): never => {
  const queryError = new QueryError(operation, error);

  logger.error("データの取得に失敗しました", {
    code: queryError.code,
    message: error.message,
    operation,
  });

  throw queryError;
};

/**
 * Returns the data of a Supabase response, or throws a `QueryError` named
 * `operation` when the query failed.
 *
 * A response with an empty body (e.g. a 404 without one) has neither `data`
 * nor `error`, so callers that read a list should fall back to `[]`.
 */
export const unwrap = <T>(result: QueryResult<T>, operation: string): T => {
  if (result.error) {
    fail(operation, result.error);
  }

  return result.data as T;
};

/**
 * Like `unwrap()`, but returns `null` when the requested row does not exist
 * (see `isNotFoundError()`).
 */
export const unwrapOrNull = <T>(
  result: QueryResult<T>,
  operation: string
): T | null => {
  if (isNotFoundError(result.error)) {
    return null;
  }

  return unwrap(result, operation);
};

/**
 * Returns the `count` of a Supabase response (`0` when it has none), or
 * throws a `QueryError` named `operation` when the query failed.
 */
export const unwrapCount = (
  result: CountQueryResult,
  operation: string
): number => {
  if (result.error) {
    fail(operation, result.error);
  }

  return result.count ?? 0;
};
