import { createClient } from "@supabase/supabase-js";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

import type { TypedSupabaseClient } from "../../types.js";
import type { NewPlatformVideo, NewVideo } from "../database/videos.js";

const SUPABASE_URL = "https://fake.supabase.test";

/** A PostgREST request made by the code under test. */
export interface SupabaseRequest {
  body: unknown;
  method: string;
  /** Query string parameters, e.g. `id` → `in.(a,b)`. */
  query: Record<string, string>;
  /** The table, or `rpc/<name>` for a database function. */
  table: string;
}

/**
 * Answers a PostgREST request: return the rows (or a prepared `Response`, to
 * simulate an error) the database would send back.
 */
export type SupabaseResponder = (
  request: SupabaseRequest
) => unknown | Promise<unknown>;

/**
 * How the database answers each kind of request, keyed by method and table
 * (e.g. `GET talents`, `PATCH videos`, `POST rpc/soft_delete_videos`): the rows to return, or a responder
 * for answers that depend on the request.
 */
export type SupabaseRoutes = Record<
  `${string} ${string}`,
  unknown[] | SupabaseResponder
>;

/** A video inserted with `insert_video`: its `videos` row and its platform row. */
export interface InsertedVideo {
  platform: NewPlatformVideo["platform"];
  platformVideo: NewPlatformVideo["values"];
  video: NewVideo;
}

/** The response of `insert_video` when it inserts the video: a new video ID. */
export const newVideoId = (): Response =>
  HttpResponse.json(crypto.randomUUID());

/**
 * The response of `insert_video` when the platform video already exists
 * (another run saved it first): `NULL`, and nothing is inserted.
 */
export const alreadySaved = (): Response => HttpResponse.json(null);

/**
 * Builds the response PostgREST sends when a statement fails.
 */
export const postgresError = (code: string, message: string): Response =>
  HttpResponse.json(
    { code, details: null, hint: null, message },
    { status: code === "23505" ? 409 : 400 }
  );

/**
 * Starts a mock Supabase for the current test file.
 *
 * Tests describe the database with `respondWith` (or `respond`) and inspect
 * `requests` to assert on what was written. Requests to anything else fail
 * the test, so nothing can reach the network by accident.
 */
export const setupSupabase = () => {
  const server = setupServer();
  const requests: SupabaseRequest[] = [];

  beforeAll(() => {
    server.listen({ onUnhandledFrame: "error" });
  });

  afterEach(() => {
    server.resetHandlers();
    requests.length = 0;
  });

  afterAll(() => {
    server.close();
  });

  /** Defines how the database answers during the current test. */
  const respond = (responder: SupabaseResponder): void => {
    const handle = async (request: Request, table: string) => {
      const text = await request.text();
      const recorded: SupabaseRequest = {
        body: text ? JSON.parse(text) : undefined,
        method: request.method,
        query: Object.fromEntries(new URL(request.url).searchParams),
        table,
      };

      requests.push(recorded);

      const result = await responder(recorded);

      return result instanceof Response
        ? result
        : HttpResponse.json(result ?? []);
    };

    server.use(
      http.all(`${SUPABASE_URL}/rest/v1/rpc/:name`, ({ params, request }) =>
        handle(request, `rpc/${String(params["name"])}`)
      ),
      http.all(`${SUPABASE_URL}/rest/v1/:table`, ({ params, request }) =>
        handle(request, String(params["table"]))
      )
    );
  };

  return {
    /** The videos inserted with `insert_video` so far in the current test. */
    insertedVideos(): InsertedVideo[] {
      return requests
        .filter(
          (request) =>
            request.method === "POST" && request.table === "rpc/insert_video"
        )
        .map(({ body }) => {
          const { p_platform, p_platform_video, p_video } = body as {
            p_platform: InsertedVideo["platform"];
            p_platform_video: InsertedVideo["platformVideo"];
            p_video: InsertedVideo["video"];
          };

          return {
            platform: p_platform,
            platformVideo: p_platform_video,
            video: p_video,
          };
        });
    },
    /** Every PostgREST request made so far in the current test. */
    requests,
    respond,
    /**
     * Defines how the database answers by method and table. Requests without
     * a route succeed and return no rows, except `insert_video`, which
     * returns a new video ID like the function does.
     */
    respondWith(routes: SupabaseRoutes): void {
      respond((request) => {
        const route = routes[`${request.method} ${request.table}`];

        if (typeof route === "function") {
          return route(request);
        }

        if (!route && request.table === "rpc/insert_video") {
          return newVideoId();
        }

        return route ?? [];
      });
    },
    /** The underlying MSW server, for non-database endpoints. */
    server,
    supabaseClient: createClient(
      SUPABASE_URL,
      "fake-key"
    ) as TypedSupabaseClient,
    /** Requests of one kind, e.g. `written('PATCH', 'videos')`. */
    written(method: string, table: string): SupabaseRequest[] {
      return requests.filter(
        (request) => request.method === method && request.table === table
      );
    },
  };
};
