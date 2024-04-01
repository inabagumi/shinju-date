import { MetadataRoute } from 'next'
import { themeColor, title } from '@/lib/constants'

export default function robots(): MetadataRoute.Manifest {
  return {
    background_color: '#f2f1ff', // var(--color-774-nevy-50)
    display: 'standalone',
    icons: [
      {
        sizes: '192x192',
        src: '/icon/medium?v=20240329',
        type: 'image/png'
      },
      {
        sizes: '512x512',
        src: '/icon/large?v=20240329',
        type: 'image/png'
      }
    ],
    name: title,
    scope: '/',
    short_name: title,
    start_url: '/',
    theme_color: themeColor
  }
}
