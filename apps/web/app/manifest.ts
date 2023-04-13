import { MetadataRoute } from 'next'
import { title } from '@/lib/constants'
import favicon512x512 from './icon1.png'
import favicon192x192 from './icon2.png'

export default function robots(): MetadataRoute.Manifest {
  return {
    background_color: '#fff',
    display: 'standalone',
    icons: [
      {
        sizes: `${favicon192x192.width}x${favicon192x192.height}`,
        src: favicon192x192.src,
        type: 'image/png'
      },
      {
        sizes: `${favicon512x512.width}x${favicon512x512.height}`,
        src: favicon512x512.src,
        type: 'image/png'
      }
    ],
    name: title,
    scope: '/',
    short_name: title,
    start_url: '/?utm_source=homescreen',
    theme_color: '#212121'
  }
}
