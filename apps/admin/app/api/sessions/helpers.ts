import { type NextRequest, NextResponse } from 'next/server'
import { SESSION_ID_COOKIE_KEY } from '@/lib/constants'

export function createErrorResponse(status: number, message?: string) {
  return NextResponse.json(
    { error: message ?? status.toString(10) },
    {
      status
    }
  )
}

export function getSessionID(request: NextRequest): string | undefined {
  return request.cookies.get(SESSION_ID_COOKIE_KEY)?.value
}
