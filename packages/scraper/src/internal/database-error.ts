export interface PostgrestErrorLike {
  code?: string;
  message: string;
}

/**
 * A query to the database failed. `operation` names what was being done, so
 * that error reports can be told apart without reading the message.
 */
export class DatabaseError extends Error {
  readonly operation: string;

  constructor(operation: string, cause: PostgrestErrorLike) {
    super(`${operation}: ${cause.message}`, { cause });
    this.name = "DatabaseError";
    this.operation = operation;
  }
}
