import * as ipaddr from 'ipaddr.js'

/**
 * The IP address range for Imgix.
 *
 * @see https://docs.imgix.com/best-practices/ensuring-origin-deliverability#identifying-requests-from-imgix
 */
const IMGIX_IP_ADDRESS_RANGE = ['104.129.144.0/22', '194.38.4.0/22']

const ACCEPTABLE_IMAGE_TYPES = [
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp'
]

export function isImgixIPAddress(addr: ipaddr.IPv4 | ipaddr.IPv6): boolean {
  return IMGIX_IP_ADDRESS_RANGE.some((mask) =>
    addr.match(ipaddr.parseCIDR(mask))
  )
}

export function isImgixUserAgent(userAgent: string): boolean {
  return userAgent.startsWith('imgix/')
}

type IsRequestFromImgixOptions = {
  ip: string
  ua: string
}

export function isRequestFromImgix({ ip, ua }: IsRequestFromImgixOptions) {
  const addr = ipaddr.parse(ip)

  return isImgixUserAgent(ua) && isImgixIPAddress(addr)
}

export function isImageResponse(res: Response): boolean {
  const contentType = res.headers.get('content-type')

  return !!contentType && ACCEPTABLE_IMAGE_TYPES.includes(contentType)
}
