import type { default as Database } from "@shinju-date/database";
import { createClient } from "@supabase/supabase-js";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

import type { TypedSupabaseClient } from "@/lib/supabase";
import { NO_ROWS_ERROR_CODE } from "@/lib/supabase/query";

const SUPABASE_URL = "https://fake.supabase.test";

/**
 * What a PostgREST request does: the query builder method that sent it
 * (`rpc` for a database function).
 */
export type SupabaseOperation =
  | "delete"
  | "insert"
  | "rpc"
  | "select"
  | "update"
  | "upsert";

/** A PostgREST request made by the code under test. */
export interface SupabaseRequest {
  body: unknown;
  operation: SupabaseOperation;
  /**
   * Query string parameters, e.g. `id` → `eq.talent-1`. A column filtered
   * twice keeps only its last filter; read `searchParams` for every one.
   */
  query: Record<string, string>;
  searchParams: URLSearchParams;
  /**
   * Whether the database must answer with exactly one row: `single()`, or
   * `maybeSingle()` after a write. `maybeSingle()` on a select reads a list.
   */
  single: boolean;
  /** The table, or the function for `rpc`. */
  table: string;
}

/**
 * The rows the database sends back (a single row for `single()` may be given
 * as an array of one), or a prepared `Response`, e.g. from `postgresError()`.
 */
export type SupabaseResult = unknown;

/** Answers a request, or gives the result to answer with. */
export type SupabaseResponder =
  | SupabaseResult
  | ((request: SupabaseRequest) => SupabaseResult | Promise<SupabaseResult>);

/**
 * Builds the response PostgREST sends when a statement fails. Supabase
 * returns it to the caller as `error`, with the given `code` and `message`.
 */
export function postgresError(code: string, message: string): Response {
  return HttpResponse.json(
    { code, details: null, hint: null, message },
    { status: code === "23505" ? 409 : 400 }
  );
}

/** Builds the response for a query that asked for a `count`. */
export function withCount(rows: unknown[], count: number): Response {
  return HttpResponse.json(rows, {
    headers: {
      "Content-Range": `${rows.length > 0 ? `0-${rows.length - 1}` : "*"}/${count}`,
    },
  });
}

function operationOf(
  request: Request,
  isRpc: boolean
): SupabaseOperation | null {
  if (isRpc) {
    return "rpc";
  }

  switch (request.method) {
    case "GET":
    case "HEAD": {
      return "select";
    }
    case "POST": {
      return /resolution=(merge|ignore)-duplicates/.test(
        request.headers.get("Prefer") ?? ""
      )
        ? "upsert"
        : "insert";
    }
    case "PATCH": {
      return "update";
    }
    case "DELETE": {
      return "delete";
    }
    default: {
      return null;
    }
  }
}

function noRows(): Response {
  return HttpResponse.json(
    {
      code: NO_ROWS_ERROR_CODE,
      details: "The result contains 0 rows",
      hint: null,
      message: "JSON object requested, multiple (or no) rows returned",
    },
    { status: 406 }
  );
}

function toResponse(request: SupabaseRequest, result: unknown): Response {
  if (result instanceof Response) {
    return result;
  }

  if (request.operation === "rpc") {
    return HttpResponse.json(result ?? null);
  }

  if (request.single) {
    const rows = Array.isArray(result)
      ? result
      : result == null
        ? []
        : [result];

    return rows.length === 1 ? HttpResponse.json(rows[0]) : noRows();
  }

  return HttpResponse.json(
    Array.isArray(result) || result == null ? (result ?? []) : [result]
  );
}

function key(operation: SupabaseOperation, table: string): string {
  return `${operation} ${table}`;
}

/**
 * Starts a fake Supabase for the current test file: a real client whose
 * PostgREST requests are answered by the test.
 *
 * Tests describe the database per table and operation with `on()` (every
 * request) or `once()` (the next request, before `on()`), and inspect
 * `requests` or `calls()` to assert on what was read and written. A request
 * nobody answers gets no rows. Requests to anything else fail the test, so
 * nothing can reach the network by accident.
 *
 * Answers and recorded requests are cleared after each test.
 */
export function setupSupabase() {
  const requests: SupabaseRequest[] = [];
  const persistent = new Map<string, SupabaseResponder>();
  const queued = new Map<string, SupabaseResponder[]>();

  async function answer(request: SupabaseRequest): Promise<Response> {
    const name = key(request.operation, request.table);
    const responder = queued.get(name)?.shift() ?? persistent.get(name);
    const result =
      typeof responder === "function" ? await responder(request) : responder;

    return toResponse(request, result);
  }

  const server = setupServer(
    http.all(`${SUPABASE_URL}/rest/v1/*`, async ({ request }) => {
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\/rest\/v1\//, "");
      const isRpc = path.startsWith("rpc/");
      const operation = operationOf(request, isRpc);

      if (!operation) {
        return new HttpResponse(null, { status: 405 });
      }

      const text = await request.text();
      const recorded: SupabaseRequest = {
        body: text ? JSON.parse(text) : undefined,
        operation,
        query: Object.fromEntries(url.searchParams),
        searchParams: url.searchParams,
        single: (request.headers.get("Accept") ?? "").includes(
          "vnd.pgrst.object"
        ),
        table: isRpc ? path.slice("rpc/".length) : path,
      };

      requests.push(recorded);

      const response = await answer(recorded);

      // A `head: true` query (for a count) reads only the headers.
      return request.method === "HEAD"
        ? new HttpResponse(null, {
            headers: response.headers,
            status: response.status,
          })
        : response;
    })
  );

  beforeAll(() => {
    server.listen({ onUnhandledFrame: "error" });
  });

  afterEach(() => {
    server.resetHandlers();
    persistent.clear();
    queued.clear();
    requests.length = 0;
  });

  afterAll(() => {
    server.close();
  });

  return {
    /** Requests of one kind, e.g. `calls('update', 'videos')`. */
    calls(operation: SupabaseOperation, table: string): SupabaseRequest[] {
      return requests.filter(
        (request) => request.operation === operation && request.table === table
      );
    },
    client: createClient<Database>(SUPABASE_URL, "fake-key", {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }) as TypedSupabaseClient,
    /** Answers every `operation` on `table` during the current test. */
    on(
      operation: SupabaseOperation,
      table: string,
      responder: SupabaseResponder
    ): void {
      persistent.set(key(operation, table), responder);
    },
    /**
     * Answers the next `operation` on `table`, ahead of `on()`. Calls queue
     * up, so consecutive requests can get different answers.
     */
    once(
      operation: SupabaseOperation,
      table: string,
      responder: SupabaseResponder
    ): void {
      const name = key(operation, table);
      queued.set(name, [...(queued.get(name) ?? []), responder]);
    },
    /** Every PostgREST request made so far in the current test. */
    requests,
    /** The underlying MSW server, for endpoints other than PostgREST. */
    server,
  };
}

export type FakeSupabase = ReturnType<typeof setupSupabase>;
