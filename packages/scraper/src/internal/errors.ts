import { DatabaseError } from "./database-error.js";
import type { PostgrestErrorLike } from "./database-error.js";

/** PostgreSQL error code for a foreign key violation. */
const FOREIGN_KEY_VIOLATION = "23503";

/** The result of a Supabase query: `data` on success, `error` on failure. */
interface QueryResult {
  data: unknown;
  error: PostgrestErrorLike | null;
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
export const throwIfError = <Result extends QueryResult>(
  result: Result,
  operation: string
): Extract<Result, { error: null }>["data"] => {
  if (result.error) {
    throw new DatabaseError(operation, result.error);
  }

  // The type of `data` is not narrowed by checking `error` of a generic.
  return result.data as Extract<Result, { error: null }>["data"];
};

export const isForeignKeyViolation = (error: PostgrestErrorLike): boolean =>
  error.code === FOREIGN_KEY_VIOLATION;
