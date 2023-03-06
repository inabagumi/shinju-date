import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase/middleware'

// export const runtime = 'edge'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL('/login', request.url))
  const supabase = createSupabaseClient(request, response)

  const { error } = await supabase.auth.signOut()

  if (error) {
    return new NextResponse(error.message, {
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8'
      },
      status: error.status
    })
  }

  return response
}
