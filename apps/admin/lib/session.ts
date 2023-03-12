import { nanoid } from 'nanoid'
import { type NextRequest, NextResponse } from 'next/server'
import { SESSION_ID_COOKIE_KEY } from '@/lib/constants'

const ONE_WEEK = 1_000 * 60 * 60 * 24 * 7

type AssignSessionIDOptions = {
  request: NextRequest
  response: NextResponse
  sessionID?: string
}

export function assignSessionID({
  request,
  response,
  sessionID = nanoid()
}: AssignSessionIDOptions): void {
  const isLocal = request.nextUrl.hostname === 'localhost'

  response.cookies.set(SESSION_ID_COOKIE_KEY, sessionID, {
    expires: new Date(Date.now() + ONE_WEEK),
    httpOnly: true,
    sameSite: 'strict',
    secure: !isLocal
  })
}

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
