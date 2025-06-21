import type { NextMiddleware, NextRequest } from 'next/server'
import { joinURL } from 'ufo'

function isVideosPage(pathname: string): boolean {
  if (pathname === '/videos') {
    return true
  }

  if (pathname.startsWith('/channels/') && pathname.endsWith('/videos')) {
    return true
  }

  return false
}

export function middleware(request: NextRequest): ReturnType<NextMiddleware> {
  console.log(process.env['UPSTASH_REDIS_REST_URL'])

  if (
    isVideosPage(request.nextUrl.pathname) &&
    request.nextUrl.searchParams.has('q')
  ) {
    const queries = request.nextUrl.searchParams.getAll('q')
    const pathname = joinURL(
      request.nextUrl.pathname,
      queries.map((query) => encodeURIComponent(query)).join('/'),
    )

    return Response.redirect(new URL(pathname, request.nextUrl), 308)
  }
}
