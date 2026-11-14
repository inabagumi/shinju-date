import { DUMMY_THUMBNAIL_PNG } from '@shinju-date/constants'
import type { default as Database } from '@shinju-date/database'
import { createErrorResponse } from '@shinju-date/helpers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SIGNED_URL_EXPIRES_IN = 60 * 10 // 10 minutes

function createFallbackResponse(): NextResponse {
  return new NextResponse(DUMMY_THUMBNAIL_PNG, {
    headers: {
      'Accept-Ranges': 'none',
      'Cache-Control': `public, max-age=${SIGNED_URL_EXPIRES_IN}`,
      'Content-Type': 'image/png',
    },
  })
}

export interface ServeStorageImageOptions {
  bucket: string
  path: string
  /** A client that may sign URLs for objects in `bucket` (service role). */
  supabaseClient: SupabaseClient<Database>
}

/**
 * Streams an object of a private storage bucket through this app.
 *
 * Callers decide whether the image may be served; this only fetches it. When
 * the object cannot be fetched, a transparent 1x1 PNG is returned instead so
 * pages never show a broken image.
 */
export async function serveStorageImage(
  request: Request,
  { bucket, path, supabaseClient }: ServeStorageImageOptions,
): Promise<Response> {
  const { data, error: signedUrlError } = await supabaseClient.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN)

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
      return createFallbackResponse()
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
    return createFallbackResponse()
  }
}
