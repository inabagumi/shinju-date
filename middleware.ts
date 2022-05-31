import ipaddr from 'ipaddr.js'
// eslint-disable-next-line @next/next/no-server-import-in-page
import { type NextMiddleware, NextResponse } from 'next/server'

const THUMBNAIL_PATH_REGEXP =
  /^\/images\/youtube\/(?<id>[^./]+?)\.(?:jpg|webp)$/i

/**
 * The IP address range for Imgix.
 *
 * @see https://docs.imgix.com/best-practices/ensuring-origin-deliverability#identifying-requests-from-imgix
 */
const IMGIX_IP_ADDRESS_RANGE = ['104.129.144.0/22', '194.38.4.0/22']

function isImgixIPAddress(addr: ipaddr.IPv4 | ipaddr.IPv6): boolean {
  return IMGIX_IP_ADDRESS_RANGE.some((mask) =>
    addr.match(ipaddr.parseCIDR(mask))
  )
}

const ACCEPT_IMAGE_TYPES = [
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp'
]

function isImageResponse(res: Response): boolean {
  const contentType = res.headers.get('content-type')

  return !!contentType && ACCEPT_IMAGE_TYPES.includes(contentType)
}

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
    req.ua &&
    req.ip &&
    req.ua.ua.startsWith('imgix/') &&
    isImgixIPAddress(ipaddr.parse(req.ip))
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
