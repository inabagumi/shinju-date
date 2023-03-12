import { type Session } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { sessionSchema } from '@/lib/schemas'
import { createErrorResponse, getSessionID } from '@/lib/session'
import {
  createStorageKey,
  createSupabaseClient,
  defaultStorage
} from '@/lib/supabase'

// TODO: https://github.com/vercel/next.js/issues/46337
// export const runtime = 'edge'

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const sessionID = getSessionID(request)

  if (!sessionID) {
    return createErrorResponse(404, 'Session does not exist.')
  }

  const storageKey = createStorageKey(sessionID)
  try {
    await defaultStorage.removeItem(storageKey)
  } catch {
    return createErrorResponse(500, 'Session deletion failed.')
  }

  return new NextResponse(null, {
    status: 204
  })
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessionID = getSessionID(request)

  if (!sessionID) {
    return createErrorResponse(404, 'Session does not exist.')
  }

  const supabaseClient = createSupabaseClient({ sessionID })
  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession()

  if (error) {
    return createErrorResponse(error.status ?? 500, error.message)
  }

  if (!session) {
    return createErrorResponse(404, 'Session does not exist.')
  }

  return NextResponse.json(session)
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const sessionID = getSessionID(request)

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

  if (error) {
    return createErrorResponse(error.status ?? 500, error.message)
  }

  if (!session) {
    return createErrorResponse(404, 'Session does not exist.')
  }

  return NextResponse.json(session, {
    status: 201
  })
}
