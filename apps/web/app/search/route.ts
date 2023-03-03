import { type NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export function GET(req: NextRequest): NextResponse {
  const basePath = '/videos'
  const queries = req.nextUrl.searchParams.getAll('q')
  const query = queries.join(' ')

  return NextResponse.redirect(
    new URL(
      `${basePath}${query ? `/${encodeURIComponent(query)}` : ''}`,
      req.nextUrl
    )
  )
}
