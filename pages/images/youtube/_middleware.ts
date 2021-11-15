import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const YOUTUBE_THUMBNAIL_BASE_PATH = 'https://i.ytimg.com/vi'

export async function middleware(req: NextRequest): Promise<Response | void> {
  const { pathname } = req.nextUrl
  const match = pathname.match(/^\/images\/youtube\/(?<id>[^.]+)\.jpg/)
  const id = match?.groups?.id

  if (id) {
    req.headers.delete('Host')

    const res = await fetch(
      `${YOUTUBE_THUMBNAIL_BASE_PATH}/${id}/maxresdefault.jpg`,
      {
        headers: req.headers,
        method: 'HEAD'
      }
    )
    const url = res.ok
      ? res.url
      : `${YOUTUBE_THUMBNAIL_BASE_PATH}/${id}/hqdefault.jpg`

    return NextResponse.rewrite(url)
  }

  return
}
