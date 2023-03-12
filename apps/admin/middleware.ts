import { normalizePath } from '@shinju-date/helpers'
import { nanoid } from 'nanoid'
import { type NextRequest, NextResponse } from 'next/server'
import { SESSION_ID_COOKIE_KEY } from '@/lib/constants'
import { createSupabaseClient } from '@/lib/supabase'

const ONE_WEEK = 1_000 * 60 * 60 * 24 * 7

export const config = {
  matcher: ['/', '/channels/:id*', '/groups/:slug*', '/login']
}

type AssignSessionIDOptions = {
  request: NextRequest
  response: NextResponse
  sessionID?: string
}

function assignSessionID({
  request,
  response,
  sessionID
}: AssignSessionIDOptions): void {
  const isLocal = request.nextUrl.hostname === 'localhost'

  response.cookies.set(SESSION_ID_COOKIE_KEY, sessionID ?? nanoid(), {
    expires: new Date(Date.now() + ONE_WEEK),
    httpOnly: true,
    sameSite: 'strict',
    secure: !isLocal
  })
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
