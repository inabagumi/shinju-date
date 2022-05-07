import {
  type NextMiddleware,
  type NextRequest,
  NextResponse
} from 'next/server'

const THUMBNAIL_PATH_REGEXP = /(?<id>[^./]+?)\.(?:jpg|webp)/i

function getID(req: NextRequest): string | null {
  const match = req.nextUrl.pathname.match(THUMBNAIL_PATH_REGEXP)
  return match?.groups?.id || null
}

export const middleware: NextMiddleware = async (req) => {
  const id = getID(req)

  if (!id) return NextResponse.next()

  const res = await fetch(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`)

  return res.ok
    ? res
    : NextResponse.rewrite(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)
}
