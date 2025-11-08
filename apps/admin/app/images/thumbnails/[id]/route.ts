import { createErrorResponse } from '@shinju-date/helpers'
import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

const SIGNED_URL_EXPIRES_IN = 60 * 10 // 10 minutes

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/images/thumbnails/[id]'>,
) {
  const { id } = await ctx.params
  const supabaseClient = await createSupabaseServerClient()

  const { data: thumbnail, error } = await supabaseClient
    .from('thumbnails')
    .select('path')
    .eq('id', id)
    .is('deleted_at', null)
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

  const res = await fetch(data.signedUrl, {
    headers: fetchHeaders,
  })
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
}
