import { normalizePath } from '@shinju-date/helpers'
import { type NextRequest, NextResponse } from 'next/server'
import { SESSION_ID_COOKIE_KEY } from '@/lib/constants'
import { assignSessionID } from '@/lib/session'
import { createSupabaseClient } from '@/lib/supabase'

export const config = {
  matcher: ['/', '/channels/:id*', '/groups/:slug*', '/login']
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next()
  const sessionID = request.cookies.get(SESSION_ID_COOKIE_KEY)?.value
  const isLoginPage = request.nextUrl.pathname === '/login'

  if (sessionID) {
    const supabaseClient = createSupabaseClient({ sessionID })

    const {
      data: { session },
      error
    } = await supabaseClient.auth.getSession()

    if (session && !error) {
      if (isLoginPage) {
        const returnTo = normalizePath(
          request.nextUrl.searchParams.get('return') ?? undefined
        )

        return NextResponse.redirect(new URL(returnTo, request.url))
      } else {
        assignSessionID({ request, response, sessionID })

        return response
      }
    }
  }

  let newResponse: NextResponse
  if (isLoginPage) {
    newResponse = response
  } else {
    const newURL = new URL('/login', request.url)

    if (request.nextUrl.pathname !== '/') {
      newURL.searchParams.set('return', request.nextUrl.pathname)
    }

    newResponse = NextResponse.redirect(newURL)
  }

  assignSessionID({ request, response: newResponse, sessionID })

  return newResponse
}
