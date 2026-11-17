import { SITE_THEME_COLOR } from '@shinju-date/constants'
import { ImageResponse } from 'next/og'
import SearchIcon from '@/app/_components/search-icon'

interface SiteIconOptions {
  /** Rounds the corners. iOS rounds its icon by itself, so it does not. */
  rounded?: boolean
  /** The width and the height of the icon, in pixels. */
  size: number
}

/** The icon of the site: the search icon on the theme color. */
export function createSiteIcon({
  rounded = false,
  size,
}: SiteIconOptions): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        backgroundColor: SITE_THEME_COLOR,
        ...(rounded && { borderRadius: '10%' }),
        color: '#f2f1ff',
        display: 'flex',
        height: '100%',
        width: '100%',
      }}
    >
      <SearchIcon
        style={{
          height: '100%',
          width: '100%',
        }}
      />
    </div>,
    {
      height: size,
      width: size,
    },
  )
}
