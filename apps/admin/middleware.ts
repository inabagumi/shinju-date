import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

const isProd = process.env['NODE_ENV'] === 'production'

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next()

  const supabaseClient = createSupabaseClient({
    auth: {
      storage: {
        getItem(key) {
          return request.cookies.get(key)?.value ?? null
        },
        removeItem(key) {
          response.cookies.delete({
            httpOnly: true,
            name: key,
            sameSite: 'strict',
            secure: isProd
          })
        },
        setItem(key, value) {
          response.cookies.set(key, value, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60,
            sameSite: 'strict',
            secure: isProd
          })
        }
      }
    }
  })

  const { error } = await supabaseClient.auth.getUser()

  if (request.nextUrl.pathname === '/login' && !error) {
    return NextResponse.redirect(new URL('/', request.nextUrl), {
      headers: response.headers
    })
  } else if (request.nextUrl.pathname !== '/login' && error) {
    const loginURL = new URL('/login', request.nextUrl)

    if (request.nextUrl.pathname !== '/') {
      loginURL.searchParams.set('', request.nextUrl.pathname)
    }

    return NextResponse.redirect(loginURL, {
      headers: response.headers
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
    '/((?!_next/static|_next/image|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
