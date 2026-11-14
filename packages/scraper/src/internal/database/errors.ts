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
