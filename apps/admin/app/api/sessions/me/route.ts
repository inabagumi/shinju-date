import { type NextRequest, NextResponse } from 'next/server'
import { createErrorResponse, getSessionID } from '@/app/api/sessions/helpers'
import {
  createStorageKey,
  createSupabaseClient,
  defaultStorage
} from '@/lib/supabase'

export const runtime = 'edge'

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
