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

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - api (api endpoint)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
