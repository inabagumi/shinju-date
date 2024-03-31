import { track } from '@vercel/analytics/server'
import { supabaseClient } from '@/lib/supabase'

export const runtime = 'edge'

type TrackProperties = {
  channel_id: string
  channel_name: string
  provider: 'YouTube'
  title: string
  url: string
  video_id: string
}

async function generateTrackProperties(
  trackURL: URL
): Promise<TrackProperties> {
  if (['www.youtube.com', 'youtube.com', 'youtu.be'].includes(trackURL.host)) {
    let videoID: string | undefined

    if (trackURL.host === 'youtu.be') {
      videoID = trackURL.pathname.slice(1) || undefined
    } else if (trackURL.pathname === '/watch') {
      videoID = trackURL.searchParams.get('v') || undefined
    }

    if (videoID) {
      const { data: video, error } = await supabaseClient
        .from('videos')
        .select('channels (name, slug), slug, title')
        .eq('slug', videoID)
        .single()

      if (error) {
        throw new TypeError(error.message)
      }

      if (!video.channels) {
        throw new TypeError('The channel does not exist.')
      }

      return {
        channel_id: video.channels.slug,
        channel_name: video.channels.name,
        provider: 'YouTube',
        title: video.title,
        url: trackURL.toString(),
        video_id: video.slug
      }
    }
  }

  throw new TypeError('URLs not supported were given.')
}

export async function POST(request: Request): Promise<Response> {
  const requestType = request.headers.get('Content-Type')
  const userAgent = request.headers.get('User-Agent')
  const xForwardedFor = request.headers.get('X-Forwarded-For')

  if (requestType !== 'text/ping' || !userAgent || !xForwardedFor) {
    return new Response(null, {
      status: 415
    })
  }

  const pingTo = request.headers.get('Ping-To')

  if (!pingTo || !URL.canParse(pingTo)) {
    if (pingTo) {
      console.error(new TypeError(`Invalid URL: ${pingTo}`))
    }

    return new Response(null, {
      status: 422
    })
  }

  const trackURL = new URL(pingTo)

  if (!['http:', 'https:'].includes(trackURL.protocol)) {
    return new Response(null, {
      status: 422
    })
  }

  let trackProperties: TrackProperties

  try {
    trackProperties = await generateTrackProperties(trackURL)
  } catch (error) {
    if (error instanceof Error) {
      console.error(error)
    }

    return new Response(null, {
      status: 422
    })
  }

  const headers = new Headers({
    'User-Agent': userAgent,
    'X-Forwarded-For': xForwardedFor
  })

  const pingFrom = request.headers.get('Ping-From')

  if (pingFrom) {
    headers.set('Referer', pingFrom)
  }

  await track('Link click', trackProperties, { headers })

  return new Response(null, {
    status: 204
  })
}
