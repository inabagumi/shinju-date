import { type Session } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import { type NextRequest, NextResponse } from 'next/server'
import { sessionSchema } from '@/lib/schemas'
import { assignSessionID, createErrorResponse } from '@/lib/session'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'edge'
export const revalidate = 0

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  const sessionID = nanoid()
  const supabaseClient = createSupabaseClient({ sessionID })
  const {
    data: { session },
    error
  } = await supabaseClient.auth.setSession(partialSession)

  if (error) {
    return createErrorResponse(error.status ?? 500, error.message)
  }

  if (!session) {
    return createErrorResponse(404, 'Session does not exist.')
  }

  const response = NextResponse.json(session, {
    headers: {
      Location: new URL('/api/sessions/me', request.url).toString()
    },
    status: 201
  })

  assignSessionID({ request, response, sessionID })

  return response
}
