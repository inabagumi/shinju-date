import { MetadataRoute } from 'next'
import { themeColor, title } from '@/lib/constants'
import favicon512x512 from './icon1.png'
import favicon192x192 from './icon2.png'

export default function robots(): MetadataRoute.Manifest {
  return {
    background_color: '#fff',
    display: 'standalone',
    icons: [
      {
        sizes: [favicon192x192.width, favicon192x192.height].join('x'),
        src: favicon192x192.src,
        type: 'image/png'
      },
      {
        sizes: [favicon512x512.width, favicon512x512.height].join('x'),
        src: favicon512x512.src,
        type: 'image/png'
      }
    ],
    name: title,
    scope: '/',
    short_name: title,
    start_url: '/?utm_source=homescreen',
    theme_color: themeColor
  }
}
