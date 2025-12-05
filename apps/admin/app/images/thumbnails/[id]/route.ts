import { createErrorResponse } from '@shinju-date/helpers'
import { type NextRequest, NextResponse } from 'next/server'
import { supabaseClient } from '@/lib/supabase/admin'

const SIGNED_URL_EXPIRES_IN = 60 // 1 minute

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/images/thumbnails/[id]'>,
) {
  const { id } = await ctx.params
  const { data: thumbnail, error } = await supabaseClient
    .from('thumbnails')
    .select('path')
    .eq('id', id)
    .maybeSingle()

  if (error || !thumbnail) {
    return createErrorResponse('Failed to fetch thumbnail', { status: 404 })
  }

  const { data, error: signedUrlError } = await supabaseClient.storage
    .from('thumbnails')
    .createSignedUrl(thumbnail.path, SIGNED_URL_EXPIRES_IN)

  if (signedUrlError) {
    return createErrorResponse('Failed to create signed URL', { status: 500 })
  }

  const fetchHeaders = new Headers(request.headers)

  fetchHeaders.delete('Host')
  fetchHeaders.delete('Cookie')

  try {
    const res = await fetch(data.signedUrl, {
      headers: fetchHeaders,
    })

    // If fetch fails or returns an error status, return a dummy image
    if (!res.ok) {
      // Return a 1x1 transparent PNG as fallback
      const dummyImage = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64',
      )
      return new NextResponse(dummyImage, {
        headers: {
          'Accept-Ranges': 'none',
          'Cache-Control': `public, max-age=${SIGNED_URL_EXPIRES_IN}`,
          'Content-Type': 'image/png',
        },
      })
    }

    const headers = new Headers({
      'Accept-Ranges': res.headers.get('Accept-Ranges') || 'none',
      'Cache-Control': `public, max-age=${SIGNED_URL_EXPIRES_IN}`,
      'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
    })
    const contentLength = res.headers.get('Content-Length')

    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }

    return new NextResponse(res.body, {
      headers,
      status: res.status,
    })
  } catch (_error) {
    // If fetch throws an error (e.g., network error), return a dummy image
    const dummyImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    )
    return new NextResponse(dummyImage, {
      headers: {
        'Accept-Ranges': 'none',
        'Cache-Control': `public, max-age=${SIGNED_URL_EXPIRES_IN}`,
        'Content-Type': 'image/png',
      },
    })
  }
}
