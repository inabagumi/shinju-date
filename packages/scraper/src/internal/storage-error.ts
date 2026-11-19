interface StorageErrorLike {
  message: string;
}

/**
 * A request to Supabase Storage failed. `operation` names what was being
 * done, like `DatabaseError`.
 */
export class StorageError extends Error {
  readonly operation: string;

  constructor(operation: string, cause: StorageErrorLike) {
    super(`${operation}: ${cause.message}`, { cause });
    this.name = "StorageError";
    this.operation = operation;
  }
}
