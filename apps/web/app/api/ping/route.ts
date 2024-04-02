import { createErrorResponse } from '@shinju-date/helpers'
import getVideoByURL from './_lib/get-video-by-url'
import increment from './_lib/increment'
import track from './_lib/track'
import { Video } from './_lib/types'

export const runtime = 'edge'

export async function POST(request: Request): Promise<Response> {
  const requestType = request.headers.get('Content-Type')

  if (requestType !== 'text/ping') {
    return createErrorResponse('Unsupported Media Type', { status: 415 })
  }

  const userAgent = request.headers.get('User-Agent')
  const xForwardedFor = request.headers.get('X-Forwarded-For')

  if (!userAgent || !xForwardedFor) {
    return createErrorResponse('Unprocessable Entity', { status: 422 })
  }

  const pingTo = request.headers.get('Ping-To')

  if (!pingTo || !URL.canParse(pingTo)) {
    if (pingTo) {
      console.error(new TypeError(`Invalid URL: ${pingTo}`))
    }

    return createErrorResponse('Unprocessable Entity', { status: 422 })
  }

  const trackURL = new URL(pingTo)

  if (!['http:', 'https:'].includes(trackURL.protocol)) {
    return createErrorResponse('Unprocessable Entity', { status: 422 })
  }

  let video: Video

  try {
    video = await getVideoByURL(trackURL)
  } catch (error) {
    console.error(error)

    return createErrorResponse('Unprocessable Entity', { status: 422 })
  }

  const headers = new Headers({
    'User-Agent': userAgent,
    'X-Forwarded-For': xForwardedFor
  })

  const pingFrom = request.headers.get('Ping-From')

  if (pingFrom) {
    headers.set('Referer', pingFrom)
  }

  await Promise.all([track(video, { headers }), increment(video)])

  return new Response(null, {
    status: 204
  })
}
