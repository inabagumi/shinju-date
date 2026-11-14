import type { default as DefaultDatabase } from '@shinju-date/database'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/admin-user'
import { getSafeRedirectPath, REDIRECT_PARAM } from '@/lib/redirect-path'
import { withMockSessionCookie } from '@/lib/supabase/mock-session'

const isProd = process.env['NODE_ENV'] === 'production'

/**
 * Updates the session by refreshing the Supabase auth token if needed.
 * This function should be called in middleware to ensure authentication state
 * is properly maintained across requests. Users without the admin role are
 * treated as signed out.
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
        return withMockSessionCookie(url, request.cookies.getAll())
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

  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser()
  // 管理者ロールを持たないユーザーはログインしていないものとして扱う
  const isAdmin = !error && !!user && isAdminUser(user)

  if (request.nextUrl.pathname === '/login' && isAdmin) {
    const redirectPath = getSafeRedirectPath(
      request.nextUrl.searchParams.get(REDIRECT_PARAM),
    )

    return NextResponse.redirect(new URL(redirectPath, request.nextUrl), {
      headers: response.headers,
    })
  }

  if (request.nextUrl.pathname !== '/login' && !isAdmin) {
    const loginURL = new URL('/login', request.nextUrl)

    const redirectPath = getSafeRedirectPath(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    )

    // ログイン後に元のページへ戻れるよう、クエリ文字列を含めて渡す
    if (redirectPath !== '/') {
      loginURL.searchParams.set(REDIRECT_PARAM, redirectPath)
    }

    return NextResponse.redirect(loginURL, {
      headers: response.headers,
    })
  }

  return response
}
