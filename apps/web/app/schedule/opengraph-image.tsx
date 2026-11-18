import {
  createOgImage,
  OG_IMAGE_CONTENT_TYPE,
  OG_IMAGE_SIZE,
} from '@/lib/og-image'

const title = '配信スケジュール'

export const alt = title
export const size = OG_IMAGE_SIZE
export const contentType = OG_IMAGE_CONTENT_TYPE

export default function Image() {
  return createOgImage(title)
}
