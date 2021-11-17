import { NextResponse } from 'next/server'
import { match } from 'path-to-regexp'
import type { NextRequest } from 'next/server'

type Params = {
  id: string
  locale?: string
}

const urlMatches = [
  match<Params>('/images/youtube/:id.jpg'),
  match<Params>('/:locale/images/youtube/:id.jpg')
]

export async function middleware(
  req: NextRequest
): Promise<NextResponse | Response | undefined> {
  let id: string | undefined

  for (const urlMatch of urlMatches) {
    const m = urlMatch(req.nextUrl.pathname)
    if (m) {
      id = m.params.id
    }
  }

  if (id) {
    const res = await fetch(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`)

    return res.ok
      ? res
      : NextResponse.rewrite(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)
  }

  return
}
