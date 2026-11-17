import { HttpResponse } from 'msw'

/** The body of an error response of PostgREST. */
export interface PostgrestErrorBody {
  code: string
  details: string | null
  hint: string | null
  message: string
}

/**
 * An error that a handler of PostgREST throws to reply with an error
 * response, such as a filter that the mock does not support. `rest` (in
 * `rest.ts`) turns it into the response.
 */
export class PostgrestError extends Error {
  readonly body: PostgrestErrorBody
  readonly status: number

  constructor(
    status: number,
    { code, details = null, hint = null, message }: PostgrestErrorInit,
  ) {
    super(message)
    this.name = 'PostgrestError'
    this.body = { code, details, hint, message }
    this.status = status
  }

  toResponse(): Response {
    return HttpResponse.json(this.body, { status: this.status })
  }
}

interface PostgrestErrorInit {
  code: string
  details?: string | null
  hint?: string | null
  message: string
}

/**
 * The `PGRST100` error of PostgREST, for a query parameter that cannot be
 * parsed. The mock also uses it for the operators and the forms of filters
 * that it does not support, so that a query does not silently get a result
 * that differs from PostgREST.
 */
export function parseError(message: string, details: string): PostgrestError {
  return new PostgrestError(400, { code: 'PGRST100', details, message })
}
