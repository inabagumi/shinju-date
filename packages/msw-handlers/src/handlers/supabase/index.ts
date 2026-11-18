import { HttpResponse } from "msw";

import { ensureCollectionsSeeded } from "../../collections.js";
import { authHandlers } from "./auth.js";
import { REST_URL, rest } from "./rest.js";
import { rpcHandlers } from "./rpc.js";
import { storageHandlers } from "./storage.js";
import { createTableHandlers } from "./table-handlers.js";
import { TABLES } from "./tables.js";

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
await ensureCollectionsSeeded();

export const supabaseHandlers = [
  ...TABLES.flatMap((table) => createTableHandlers(table)),

  ...authHandlers,

  ...rpcHandlers,

  // Like PostgREST, the functions and the tables (and views) that the mock
  // does not have are not found
  rest.post(`${REST_URL}/rpc/:name`, ({ params }) =>
    HttpResponse.json(
      {
        code: "PGRST202",
        details: null,
        hint: "Add a handler of the function to src/handlers/supabase/rpc.ts.",
        message: `Could not find the function public.${String(params["name"])} in the schema cache`,
      },
      { status: 404 }
    )
  ),
  ...(["delete", "get", "head", "patch", "post"] as const).map((method) =>
    rest[method](`${REST_URL}/:name`, ({ params }) =>
      HttpResponse.json(
        {
          code: "PGRST205",
          details: null,
          hint: "Add a definition of the table to TABLES in src/handlers/supabase/tables.ts.",
          message: `Could not find the table 'public.${String(params["name"])}' in the schema cache`,
        },
        { status: 404 }
      )
    )
  ),

  ...storageHandlers,
];
