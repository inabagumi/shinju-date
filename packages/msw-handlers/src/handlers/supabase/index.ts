import { HttpResponse } from 'msw'
import { ensureCollectionsSeeded } from '../../collections.js'
import { authHandlers } from './auth.js'
import { REST_URL, rest } from './rest.js'
import { rpcHandlers } from './rpc.js'
import { storageHandlers } from './storage.js'
import { createTableHandlers } from './table-handlers.js'
import { TABLES } from './tables.js'

/**
 * Mock handlers of the Supabase APIs, backed by the `@msw/data` collections
 * (`src/collections.ts`).
 *
 * - The tables listed in `tables.ts` share the same handlers of PostgREST
 *   (`table-handlers.ts`), built from the definitions of the tables
 * - The database functions (`rpc.ts`), Supabase Auth (`auth.ts`) and Supabase
 *   Storage (`storage.ts`) have handlers of their own
 */

// Initialize collections with seed data
await ensureCollectionsSeeded()

export const supabaseHandlers = [
  ...TABLES.flatMap((table) => createTableHandlers(table)),

  ...authHandlers,

  // Tables without mock data, such as `audit_logs` (read through
  // `get_audit_logs`), and health checks return no rows
  rest.get(`${REST_URL}/*`, () => HttpResponse.json([])),

  ...rpcHandlers,

  ...storageHandlers,
]
