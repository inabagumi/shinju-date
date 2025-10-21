import type { default as DefaultDatabase } from '@shinju-date/database'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const isProd = process.env['NODE_ENV'] === 'production'

/**
 * Updates the session by refreshing the Supabase auth token if needed.
 * This function should be called in middleware to ensure authentication state
 * is properly maintained across requests.
 *
 * @param request - The incoming Next.js request
 * @returns A NextResponse with updated session cookies
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
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
  }

  if (request.nextUrl.pathname !== '/login' && error) {
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
