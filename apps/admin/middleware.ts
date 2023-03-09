import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase/middleware'

export const config = {
  matcher: ['/', '/channels', '/channels/:id', '/groups', '/groups/:slug']
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next()
  const supabase = createSupabaseClient(request, response)

  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  if (!session || error) {
    const newURL = new URL('/login', request.url)

    newURL.searchParams.set('return', request.nextUrl.pathname)

    return NextResponse.redirect(newURL)
  }

  return response
}
