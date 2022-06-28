import { type NextRequest, NextResponse } from 'next/server'

export const config = {
  runtime: 'experimental-edge'
}

const handler = (req: NextRequest): NextResponse => {
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

export default handler
