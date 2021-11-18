import { NextResponse } from 'next/server'
import { basename } from 'path'
import type { NextRequest } from 'next/server'

export async function middleware(
  req: NextRequest
): Promise<NextResponse | Response | undefined> {
  const id = basename(req.nextUrl.pathname, '.jpg')
  const res = await fetch(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`)

  return res.ok
    ? res
    : NextResponse.rewrite(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)
}
