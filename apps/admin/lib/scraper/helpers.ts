import { Temporal } from '@js-temporal/polyfill'
import fetch from '@shinju-date/fetch'
import pRetry, { AbortError } from 'p-retry'
import { type FilteredYouTubeVideo } from '@/lib/youtube'

export function getPublishedAt(video: FilteredYouTubeVideo): Temporal.Instant {
  const publishedAt =
    video.liveStreamingDetails?.actualStartTime ??
    video.liveStreamingDetails?.scheduledStartTime ??
    video.snippet.publishedAt

  return Temporal.Instant.from(publishedAt)
}

export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && typeof value !== 'undefined'
}

export function retryableFetch(
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
