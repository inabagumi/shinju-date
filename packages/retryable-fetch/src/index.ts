import pRetry from 'p-retry'

/** The number of retries after the first attempt. */
const RETRIES = 5

/**
 * Methods that are safe to send again. Other methods may change data on the
 * server, so they are sent only once.
 */
const RETRYABLE_METHODS = new Set(['GET', 'HEAD'])

/**
 * Whether a response is worth retrying: a timeout, rate limiting or a server
 * error. Other responses (such as 400, 404 or 406) do not change when sent
 * again.
 */
function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

/** The first argument of `fetch`: a URL or a `Request`. */
type FetchInput = Parameters<typeof fetch>[0]

function getMethod(input: FetchInput, init?: RequestInit): string {
  const method =
    init?.method ?? (input instanceof Request ? input.method : 'GET')

  return method.toUpperCase()
}

function getSignal(
  input: FetchInput,
  init?: RequestInit,
): AbortSignal | undefined {
  // `signal: null` detaches the request's signal, as in `fetch`.
  if (init?.signal !== undefined) {
    return init.signal ?? undefined
  }

  return input instanceof Request ? input.signal : undefined
}

/** Thrown inside the retry loop to retry a response that may change. */
class RetryableResponseError extends Error {
  constructor(response: Response) {
    super(`${response.status} ${response.statusText}`.trim())
    this.name = 'RetryableResponseError'
  }
}

async function discardBody(response: Response): Promise<void> {
  try {
    // The body is read to reuse the socket.
    // see https://github.com/nodejs/undici/issues/1203#issuecomment-1398191693
    await response.arrayBuffer()
  } catch {
    // The response is thrown away anyway.
  }
}

/**
 * `fetch` that retries failures that may go away when sent again.
 *
 * - Only `GET` and `HEAD` requests are retried. Other methods are sent once.
 * - A request is retried when `fetch` itself fails (such as a network error)
 *   or the response is `408`, `429` or `5xx`, up to 5 times with exponential
 *   backoff.
 * - Any received response is returned as it is, including `4xx` and the last
 *   `5xx` response, so callers must check `response.ok`.
 * - Retrying stops when `init.signal` (or the request's signal) is aborted.
 */
export default function retryableFetch(
  ...args: Parameters<typeof fetch>
): Promise<Response> {
  const [input, init] = args

  if (!RETRYABLE_METHODS.has(getMethod(input, init))) {
    return fetch(...args)
  }

  const signal = getSignal(input, init)

  return pRetry<Response>(
    async (attemptNumber) => {
      const response = await fetch(...args)

      if (isRetryableStatus(response.status) && attemptNumber <= RETRIES) {
        await discardBody(response)

        throw new RetryableResponseError(response)
      }

      return response
    },
    {
      retries: RETRIES,
      ...(signal ? { signal } : {}),
    },
  )
}
