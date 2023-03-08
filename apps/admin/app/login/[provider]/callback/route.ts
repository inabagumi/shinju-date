import { verifyOrigin } from '@shinju-date/helpers'
import { notFound } from 'next/navigation'
import { type NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase/middleware'

type Params = {
  provider: 'email'
}

type Props = {
  params: Params
}

export async function GET(
  request: NextRequest,
  { params }: Props
): Promise<NextResponse> {
  if (params.provider !== 'email') {
    notFound()
  }

  if (!verifyOrigin(request)) {
    return new NextResponse('422 Unprocessable Entity', {
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8'
      },
      status: 422
    })
  }

  const response = NextResponse.redirect(new URL('/', request.url))
  const supabase = createSupabaseClient(request, response)
  const email = request.nextUrl.searchParams.get('email') ?? ''
  const token = request.nextUrl.searchParams.get('token') ?? ''
  const {
    data: { session },
    error
  } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'magiclink'
  })

  if (!session || error) {
    return new NextResponse('403 Forbidden', {
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8'
      },
      status: 403
    })
  }

  return response
}
