import { type Session } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { SESSION_ID_COOKIE_KEY } from '@/lib/constants'
import { sessionSchema } from '@/lib/schemas'
import { createSupabaseClient } from '@/lib/supabase'

//TODO: https://github.com/vercel/next.js/issues/46337
// export const runtime = 'edge'

function createErrorResponse(status: number, message?: string) {
  return NextResponse.json(
    {
      error: message ?? status.toString(10)
    },
    {
      status
    }
  )
}

export function DELETE(request: NextRequest): NextResponse {
  if (!request.cookies.has(SESSION_ID_COOKIE_KEY)) {
    return NextResponse.json(
      {
        error: 'Session does not exist.'
      },
      {
        status: 404
      }
    )
  }

  const response = new NextResponse('204 No Content', {
    status: 204
  })

  response.cookies.delete(SESSION_ID_COOKIE_KEY)

  return response
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessionID = request.cookies.get(SESSION_ID_COOKIE_KEY)?.value

  if (!sessionID) {
    return createErrorResponse(404, 'Session does not exist.')
  }

  const supabaseClient = createSupabaseClient({ sessionID })
  const {
    data: { session }
  } = await supabaseClient.auth.getSession()

  return NextResponse.json({
    access_token: session?.access_token ?? '',
    id: sessionID,
    refresh_token: session?.refresh_token ?? ''
  })
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const sessionID = request.cookies.get(SESSION_ID_COOKIE_KEY)?.value

  if (!sessionID) {
    return createErrorResponse(404, 'Session does not exist.')
  }

  let maybeSession: unknown
  try {
    maybeSession = await request.json()
  } catch {
    return createErrorResponse(400, 'Failed to parse requested JSON')
  }

  let partialSession: Pick<Session, 'access_token' | 'refresh_token'>
  try {
    partialSession = await sessionSchema.validate(maybeSession)
  } catch {
    return createErrorResponse(
      422,
      'Requires an access token and a refresh token.'
    )
  }

  const supabaseClient = createSupabaseClient({ sessionID })
  const {
    data: { session },
    error
  } = await supabaseClient.auth.setSession(partialSession)

  if (!session || error) {
    return createErrorResponse(500, error?.message ?? 'Internal Server Error')
  }

  return NextResponse.json({
    access_token: session.access_token,
    id: sessionID,
    refresh_token: session.refresh_token
  })
}
