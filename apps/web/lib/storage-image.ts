import { DUMMY_THUMBNAIL_PNG } from '@shinju-date/constants'
import type { default as Database } from '@shinju-date/database'
import { createErrorResponse } from '@shinju-date/helpers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/** How long signed URLs, and therefore the served images, stay valid. */
export const SIGNED_URL_EXPIRES_IN = 60 * 10 // 10 minutes

export interface ProxyStorageImageOptions {
  bucket: string
  path: string
  request: Request
  /** A client allowed to sign URLs for the (private) bucket. */
  storageClient: SupabaseClient<Database>
}

function createFallbackResponse(): NextResponse {
  return new NextResponse(DUMMY_THUMBNAIL_PNG, {
    headers: {
      'Accept-Ranges': 'none',
      'Cache-Control': `public, max-age=${SIGNED_URL_EXPIRES_IN}`,
      'Content-Type': 'image/png',
    },
  })
}

/**
 * Streams an image stored in a private Supabase Storage bucket.
 *
 * Callers must have checked that the image may be shown before calling this.
 * When the stored object cannot be fetched, a transparent placeholder is
 * returned so that pages still render.
 */
export async function proxyStorageImage({
  bucket,
  path,
  request,
  storageClient,
}: ProxyStorageImageOptions): Promise<Response> {
  const { data, error } = await storageClient.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN)

  if (error) {
    return createErrorResponse('Failed to create signed URL', { status: 500 })
  }

  const fetchHeaders = new Headers(request.headers)

  fetchHeaders.delete('Host')
  fetchHeaders.delete('Cookie')

  try {
    const res = await fetch(data.signedUrl, {
      headers: fetchHeaders,
    })

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
    // e.g. a network error
    return createFallbackResponse()
  }
}
