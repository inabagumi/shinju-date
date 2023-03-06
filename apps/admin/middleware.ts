import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase/middleware'

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
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}
