import { createClient } from '@supabase/supabase-js'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'
import type { TypedSupabaseClient } from '../../types.js'

const SUPABASE_URL = 'https://fake.supabase.test'

/** A PostgREST request made by the code under test. */
export interface SupabaseRequest {
  body: unknown
  method: string
  /** Query string parameters, e.g. `id` → `in.(a,b)`. */
  query: Record<string, string>
  table: string
}

/**
 * Answers a PostgREST request: return the rows (or a prepared `Response`, to
 * simulate an error) the database would send back.
 */
export type SupabaseResponder = (
  request: SupabaseRequest,
) => unknown | Promise<unknown>

/**
 * Builds the response PostgREST sends when a statement fails.
 */
export function postgresError(code: string, message: string): Response {
  return HttpResponse.json(
    { code, details: null, hint: null, message },
    { status: code === '23505' ? 409 : 400 },
  )
}

/**
 * Starts a mock Supabase for the current test file.
 *
 * Tests describe the database with `respond` and inspect `requests` to assert
 * on what was written. Requests to anything else fail the test, so nothing
 * can reach the network by accident.
 */
export function setupSupabase() {
  const server = setupServer()
  const requests: SupabaseRequest[] = []

  beforeAll(() => {
    server.listen({ onUnhandledFrame: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
    requests.length = 0
  })

  afterAll(() => {
    server.close()
  })

  return {
    /** Every PostgREST request made so far in the current test. */
    requests,
    /** Defines how the database answers during the current test. */
    respond(responder: SupabaseResponder): void {
      server.use(
        http.all(
          `${SUPABASE_URL}/rest/v1/:table`,
          async ({ params, request }) => {
            const text = await request.text()
            const recorded: SupabaseRequest = {
              body: text ? JSON.parse(text) : undefined,
              method: request.method,
              query: Object.fromEntries(new URL(request.url).searchParams),
              table: String(params['table']),
            }

            requests.push(recorded)

            const result = await responder(recorded)

            return result instanceof Response
              ? result
              : HttpResponse.json(result ?? [])
          },
        ),
      )
    },
    /** The underlying MSW server, for non-database endpoints. */
    server,
    supabaseClient: createClient(
      SUPABASE_URL,
      'fake-key',
    ) as TypedSupabaseClient,
    /** Requests of one kind, e.g. `written('PATCH', 'videos')`. */
    written(method: string, table: string): SupabaseRequest[] {
      return requests.filter(
        (request) => request.method === method && request.table === table,
      )
    },
  }
}
