import * as Sentry from '@sentry/nextjs'
import { createErrorResponse } from '@shinju-date/helpers'
import getVideoByURL from './_lib/get-video-by-url'
import increment from './_lib/increment'
import track from './_lib/track'
import type { Video } from './_lib/types'

export async function POST(request: Request): Promise<Response> {
  const requestType = request.headers.get('Content-Type')
  const userAgent = request.headers.get('User-Agent')
  const xForwardedFor = request.headers.get('X-Forwarded-For')
  const pingTo = request.headers.get('Ping-To')

  if (
    requestType !== 'text/ping' ||
    !userAgent ||
    !xForwardedFor ||
    !pingTo ||
    !URL.canParse(pingTo)
  ) {
    Sentry.logger.warn('An invalid request was received.', {
      headers: request.headers.entries(),
    })

    if (requestType !== 'text/ping') {
      return createErrorResponse('Unsupported Media Type', {
        status: 415,
      })
    } else {
      return createErrorResponse('Unprocessable Entity', {
        status: 422,
      })
    }
  }

  const trackURL = new URL(pingTo)

  if (!['http:', 'https:'].includes(trackURL.protocol)) {
    Sentry.logger.warn('An invalid request was received.', {
      headers: request.headers.entries(),
    })

    return createErrorResponse('Unprocessable Entity', {
      status: 422,
    })
  }

  let video: Video

  try {
    video = await getVideoByURL(trackURL)
  } catch (error) {
    Sentry.logger.warn('Video does not exist.', {
      cause: error,
      url: trackURL.toString(),
    })

    return createErrorResponse('Unprocessable Entity', {
      status: 422,
    })
  }

  const headers = new Headers({
    'User-Agent': userAgent,
    'X-Forwarded-For': xForwardedFor,
  })

  const pingFrom = request.headers.get('Ping-From')

  if (pingFrom) {
    headers.set('Referer', pingFrom)
  }

  await Promise.all([
    track(video, {
      headers,
    }),
    increment(video),
  ])

  Sentry.logger.info('A click event has been sent.', {
    id: video.id,
    talent_name: video.talent.name,
    title: video.title,
  })

  return new Response(null, {
    status: 204,
  })
}
