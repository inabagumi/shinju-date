import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const config = {
  matcher: ['/']
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next()
  const supabase = createSupabaseClient(request, response)

  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  if (!session || error) {
    const nextUrl = request.nextUrl.clone()
    nextUrl.pathname = '/login'

    return NextResponse.redirect(nextUrl)
  }

  return response
}
