import { verifyOrigin } from '@shinju-date/helpers'
import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase/middleware'

// export const runtime = 'edge'

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyOrigin(request)) {
    return new NextResponse('422 Unprocessable Entity', {
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8'
      },
      status: 422
    })
  }

  const response = NextResponse.redirect(new URL('/login', request.url))
  const supabase = createSupabaseClient(request, response)

  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (session) {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return new NextResponse(error.message, {
        headers: {
          'Content-Type': 'text/plain; charset=UTF-8'
        },
        status: error.status
      })
    }
  }

  return response
}
