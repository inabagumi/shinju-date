import ipaddr from 'ipaddr.js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * The IP address range for Imgix
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

export async function middleware(
  req: NextRequest
): Promise<NextResponse | Response> {
  if (
    req.ip &&
    req.headers.get('user-agent')?.startsWith('imgix/') &&
    isImgixIPAddress(ipaddr.parse(req.ip))
  ) {
    const res = await fetch(req)

    return isImageResponse(res)
      ? res
      : new Response('Not Found', {
          status: 404,
          statusText: 'Not Found'
        })
  }

  if (req.nextUrl.pathname.endsWith('/videos')) {
    const query = req.nextUrl.searchParams.getAll('q').filter(Boolean).join(' ')

    if (query) {
      return NextResponse.redirect(
        `${req.nextUrl.pathname}/${encodeURIComponent(query)}`
      )
    }
  }

  return NextResponse.next()
}
