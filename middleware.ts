// eslint-disable-next-line @next/next/no-server-import-in-page
import { type NextMiddleware, NextResponse } from 'next/server'
import { isImageResponse, isRequestFromImgix } from './lib/imgix'

const THUMBNAIL_PATH_REGEXP =
  /^\/images\/youtube\/(?<id>[^./]+?)\.(?:jpg|webp)$/i

export const middleware: NextMiddleware = async (req) => {
  const remoteImageMatch = req.nextUrl.pathname.match(THUMBNAIL_PATH_REGEXP)
  const youtubeVideoID = remoteImageMatch?.groups?.id

  if (youtubeVideoID) {
    const res = await fetch(
      `https://i.ytimg.com/vi/${youtubeVideoID}/maxresdefault.jpg`,
      {
        method: 'HEAD'
      }
    )

    return res.ok
      ? NextResponse.rewrite(res.url)
      : NextResponse.rewrite(
          `https://i.ytimg.com/vi/${youtubeVideoID}/hqdefault.jpg`
        )
  }

  if (
    isRequestFromImgix({
      ip: req.ip ?? '127.0.0.1',
      ua: req.ua?.ua ?? ''
    })
  ) {
    const res = await fetch(req, {
      method: 'HEAD'
    })

    return isImageResponse(res)
      ? NextResponse.next()
      : new NextResponse(null, {
          status: 404,
          statusText: 'Not Found'
        })
  }

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
