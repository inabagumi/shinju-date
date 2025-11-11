import { SITE_NAME, SITE_THEME_COLOR } from '@shinju-date/constants'
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Manifest {
  return {
    background_color: '#f2f1ff', // var(--color-774-nevy-50)
    display: 'standalone',
    icons: [
      {
        sizes: '192x192',
        src: '/icon/medium?v=20240329',
        type: 'image/png',
      },
      {
        sizes: '512x512',
        src: '/icon/large?v=20240329',
        type: 'image/png',
      },
    ],
    name: SITE_NAME,
    scope: '/',
    short_name: SITE_NAME,
    start_url: '/',
    theme_color: SITE_THEME_COLOR,
  }
}
