import { type NextMiddleware, NextResponse } from 'next/server'

export const middleware: NextMiddleware = (req) => {
  if (req.nextUrl.pathname.endsWith('/videos')) {
    const query = req.nextUrl.searchParams.getAll('q').filter(Boolean).join(' ')

    if (query) {
      return NextResponse.redirect(
        new URL(
          `${req.nextUrl.pathname}/${encodeURIComponent(query)}`,
          req.nextUrl
        )
      )
    }
  }

  return NextResponse.next()
}
