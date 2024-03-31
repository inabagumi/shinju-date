import pRetry, { AbortError } from 'p-retry'

export default function retryableFetch(
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  return pRetry<Response>(
    async () => {
      const res = await fetch(input, init)

      if (!res.ok && res.status !== 304) {
        // The body is read to reuse the socket.
        // see https://github.com/nodejs/undici/issues/1203#issuecomment-1398191693
        await res.arrayBuffer()

        if (res.status === 404) {
          throw new AbortError(res.statusText)
        }

        throw new Error(res.statusText)
      }

      return res
    },
    {
      retries: 5
    }
  )
}
