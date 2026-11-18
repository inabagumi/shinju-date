import { HttpResponse, type HttpResponseResolver, http } from "msw";

import { PostgrestError } from "./errors.js";

/** The base URL of the PostgREST API of the mock Supabase project. */
export const REST_URL = "https://fake.supabase.test/rest/v1";

/**
 * The media type that supabase-js requests with `.single()`. PostgREST then
 * returns the only row as an object instead of an array.
 */
const SINGLE_OBJECT_MEDIA_TYPE = "application/vnd.pgrst.object+json";

type RestResolverInfo = Parameters<HttpResponseResolver>[0];

type RestResolver = (info: RestResolverInfo) => Response | Promise<Response>;

/** Whether the request asks for a single object (`.single()`). */
export function acceptsSingleObject(request: Request): boolean {
  return (request.headers.get("accept") ?? "").startsWith(
    SINGLE_OBJECT_MEDIA_TYPE
  );
}

/**
 * The `PGRST116` error of PostgREST, for a request for a single object whose
 * result does not contain exactly one row.
 */
export function singleObjectError(rowCount: number): Response {
  return HttpResponse.json(
    {
      code: "PGRST116",
      details: `The result contains ${rowCount} rows`,
      hint: null,
      message: "JSON object requested, multiple (or no) rows returned",
    },
    { status: 406 }
  );
}

/**
 * Reply to a request for a single object (`.single()`) like PostgREST does:
 * the only row as an object, or a `PGRST116` error when the result does not
 * contain exactly one row. Other responses are returned as they are.
 */
async function toSingleObjectResponse(
  request: Request,
  response: Response
): Promise<Response> {
  if (!acceptsSingleObject(request) || !response.ok || response.body === null) {
    return response;
  }

  const body = await response.clone().text();

  if (body === "") {
    return response;
  }

  const rows: unknown = JSON.parse(body);

  if (!Array.isArray(rows)) {
    return response;
  }

  if (rows.length !== 1) {
    return singleObjectError(rows.length);
  }

  const headers = new Headers(response.headers);
  // The length of the array does not apply to the object.
  headers.delete("Content-Length");
  headers.set("Content-Type", `${SINGLE_OBJECT_MEDIA_TYPE}; charset=utf-8`);

  return HttpResponse.json(rows[0], { headers, status: response.status });
}

function createRestHandler(
  method: "delete" | "get" | "head" | "patch" | "post"
) {
  return (url: string, resolver: RestResolver) =>
    http[method](url, async (info) => {
      try {
        return await toSingleObjectResponse(info.request, await resolver(info));
      } catch (error) {
        if (error instanceof PostgrestError) {
          return error.toResponse();
        }

        throw error;
      }
    });
}

/**
 * Use these instead of `http` for the PostgREST API (`/rest/v1/*`). Every
 * handler then supports `.single()`, so a resolver only has to return the
 * rows as an array, and a `PostgrestError` that a resolver throws becomes
 * its error response. A resolver that writes has to check the number of rows
 * with `acceptsSingleObject` before writing, as PostgREST changes nothing
 * when it returns `PGRST116`.
 */
export const rest = {
  delete: createRestHandler("delete"),
  get: createRestHandler("get"),
  head: createRestHandler("head"),
  patch: createRestHandler("patch"),
  post: createRestHandler("post"),
};
