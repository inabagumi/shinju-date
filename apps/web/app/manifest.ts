import { MetadataRoute } from 'next'
import favicon192x192 from '@/assets/favicon-192x192.png'
import favicon512x512 from '@/assets/favicon-512x512.png'
import { title } from '@/lib/constants'

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
