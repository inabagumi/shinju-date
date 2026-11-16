import { HttpResponse, type HttpResponseResolver, http } from 'msw'

/** The base URL of the PostgREST API of the mock Supabase project. */
export const REST_URL = 'https://fake.supabase.test/rest/v1'

/**
 * The media type that supabase-js requests with `.single()`. PostgREST then
 * returns the only row as an object instead of an array.
 */
const SINGLE_OBJECT_MEDIA_TYPE = 'application/vnd.pgrst.object+json'

type RestResolverInfo = Parameters<HttpResponseResolver>[0]

type RestResolver = (info: RestResolverInfo) => Response | Promise<Response>

/**
 * Reply to a request for a single object (`.single()`) like PostgREST does:
 * the only row as an object, or a `PGRST116` error when the result does not
 * contain exactly one row. Other responses are returned as they are.
 */
async function toSingleObjectResponse(
  request: Request,
  response: Response,
): Promise<Response> {
  const accept = request.headers.get('accept') ?? ''

  if (
    !accept.startsWith(SINGLE_OBJECT_MEDIA_TYPE) ||
    !response.ok ||
    response.body === null
  ) {
    return response
  }

  const body = await response.clone().text()

  if (body === '') {
    return response
  }

  const rows: unknown = JSON.parse(body)

  if (!Array.isArray(rows)) {
    return response
  }

  if (rows.length !== 1) {
    return HttpResponse.json(
      {
        code: 'PGRST116',
        details: `The result contains ${rows.length} rows`,
        hint: null,
        message: 'JSON object requested, multiple (or no) rows returned',
      },
      { status: 406 },
    )
  }

  const headers = new Headers(response.headers)
  // The length of the array does not apply to the object.
  headers.delete('Content-Length')
  headers.set('Content-Type', `${SINGLE_OBJECT_MEDIA_TYPE}; charset=utf-8`)

  return HttpResponse.json(rows[0], { headers, status: response.status })
}

function createRestHandler(
  method: 'delete' | 'get' | 'head' | 'patch' | 'post',
) {
  return (url: string, resolver: RestResolver) =>
    http[method](url, async (info) =>
      toSingleObjectResponse(info.request, await resolver(info)),
    )
}

/**
 * Use these instead of `http` for the PostgREST API (`/rest/v1/*`). Every
 * handler then supports `.single()`, so a resolver only has to return the
 * rows as an array.
 */
export const rest = {
  delete: createRestHandler('delete'),
  get: createRestHandler('get'),
  head: createRestHandler('head'),
  patch: createRestHandler('patch'),
  post: createRestHandler('post'),
}
