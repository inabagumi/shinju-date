import dedent from 'dedent'
import { NextResponse } from 'next/server'

export const revalidate = 1_800

export function GET() {
  const sitemapURL = new URL('/sitemap.xml', process.env.NEXT_PUBLIC_BASE_URL)
  const body = dedent`
    User-agent: *
    Disallow:

    Sitemap: ${sitemapURL.toString()}
  `

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8'
    }
  })
}
