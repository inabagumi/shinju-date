import type { default as DefaultDatabase } from '@shinju-date/database'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const isProd = process.env['NODE_ENV'] === 'production'

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

  if (!url || !key) {
    throw new TypeError('Supabase URL and key are required.')
  }

  const response = NextResponse.next({
    request,
  })

  const supabaseClient = createServerClient<DefaultDatabase>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value)
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: 'strict',
            secure: isProd,
          })
        }
      },
    },
  })

  const { error } = await supabaseClient.auth.getUser()

  if (request.nextUrl.pathname === '/login' && !error) {
    return NextResponse.redirect(new URL('/', request.nextUrl), {
      headers: response.headers,
    })
  } else if (request.nextUrl.pathname !== '/login' && error) {
    const loginURL = new URL('/login', request.nextUrl)

    if (request.nextUrl.pathname !== '/') {
      loginURL.searchParams.set('', request.nextUrl.pathname)
    }

    return NextResponse.redirect(loginURL, {
      headers: response.headers,
    })
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
    '/((?!_next/static|_next/image|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
