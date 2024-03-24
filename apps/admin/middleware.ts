import { createSupabaseClientWithResponse } from '@shinju-date/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const [supabaseClient, response] = createSupabaseClientWithResponse(
    undefined,
    undefined,
    { request }
  )
  const { error } = await supabaseClient.auth.getUser()

  if (request.nextUrl.pathname === '/login' && !error) {
    return NextResponse.redirect(new URL('/', request.nextUrl))
  } else if (request.nextUrl.pathname !== '/login' && error) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }

  return response
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
    '/((?!_next/static|_next/image|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
