import { createSiteIcon } from '@/lib/site-icon'

const SIZE = 180

export const contentType = 'image/png'
export const size = {
  height: SIZE,
  width: SIZE,
}

export default function AppleIcon() {
  return createSiteIcon({ size: SIZE })
}
