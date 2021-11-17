import { NextResponse } from 'next/server'
import { match } from 'path-to-regexp'
import type { NextRequest } from 'next/server'

type Params = {
  id: string
}

const urlMatch = match<Params>('/:locale/images/youtube/:id.jpg')

export async function middleware(
  req: NextRequest
): Promise<NextResponse | Response | undefined> {
  const m = urlMatch(req.nextUrl.pathname)

  if (m) {
    const res = await fetch(
      `https://i.ytimg.com/vi/${m.params.id}/maxresdefault.jpg`
    )

    return res.ok
      ? res
      : NextResponse.rewrite(
          `https://i.ytimg.com/vi/${m.params.id}/hqdefault.jpg`
        )
  }

  return
}
